import {
  Injectable,
  Inject,
  forwardRef,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository, Not, IsNull, Between } from 'typeorm';
import { FspName } from '../../../fsp/financial-service-provider.entity';
import {
  TwilioStatusCallbackDto,
  TwilioStatus,
} from '../../../notifications/twilio.dto';
import { WhatsappService } from '../../../notifications/whatsapp/whatsapp.service';
import { ProgramEntity } from '../../../programs/program.entity';
import { RegistrationEntity } from '../../../registration/registration.entity';
import { StatusEnum } from '../../../shared/enum/status.enum';
import { PaPaymentDataDto } from '../../dto/pa-payment-data.dto';
import {
  FspTransactionResultDto,
  PaTransactionResultDto,
} from '../../dto/payment-transaction-result.dto';
import crypto from 'crypto';
import { UnusedVoucherDto } from '../../dto/unused-voucher.dto';
import { ImageCodeService } from '../../imagecode/image-code.service';
import { TransactionEntity } from '../../transactions/transaction.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { IntersolveIssueCardResponse } from './dto/intersolve-issue-card-response.dto';
import { IntersolvePayoutStatus } from './enum/intersolve-payout-status.enum';
import { IntersolveResultCode } from './enum/intersolve-result-code.enum';
import { IntersolveApiService } from './instersolve.api.service';
import { IntersolveBarcodeEntity } from './intersolve-barcode.entity';
import { IntersolveInstructionsEntity } from './intersolve-instructions.entity';
import { IntersolveRequestEntity } from './intersolve-request.entity';

@Injectable()
export class IntersolveService {
  @InjectRepository(RegistrationEntity)
  private readonly registrationRepository: Repository<RegistrationEntity>;
  @InjectRepository(IntersolveBarcodeEntity)
  private readonly intersolveBarcodeRepository: Repository<
    IntersolveBarcodeEntity
  >;
  @InjectRepository(IntersolveInstructionsEntity)
  private readonly intersolveInstructionsRepository: Repository<
    IntersolveInstructionsEntity
  >;
  @InjectRepository(IntersolveRequestEntity)
  private readonly intersolveRequestRepository: Repository<
    IntersolveRequestEntity
  >;
  @InjectRepository(TransactionEntity)
  public transactionRepository: Repository<TransactionEntity>;
  @InjectRepository(ProgramEntity)
  public programRepository: Repository<ProgramEntity>;

  private readonly programId = 1;

  public constructor(
    private readonly intersolveApiService: IntersolveApiService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly imageCodeService: ImageCodeService,
    private readonly transactionsService: TransactionsService,
  ) {}

  public async sendPayment(
    paPaymentList: PaPaymentDataDto[],
    useWhatsapp: boolean,
    amount: number,
    payment: number,
  ): Promise<FspTransactionResultDto> {
    const result = new FspTransactionResultDto();
    result.paList = [];

    for (let paymentInfo of paPaymentList) {
      const paResult = await this.sendIndividualPayment(
        paymentInfo,
        useWhatsapp,
        amount,
        payment,
      );

      result.paList.push(paResult);
      // If 'waiting' then transaction is stored already earlier, to make sure it's there before status-callback comes in
      if (paResult.status !== StatusEnum.waiting) {
        const registration = await this.registrationRepository.findOne({
          select: ['id'],
          where: { referenceId: paResult.referenceId },
        });
        await this.storeTransactionResult(
          payment,
          paResult.calculatedAmount,
          registration.id,
          1,
          paResult.status,
          paResult.message,
        );
      }
    }
    result.fspName = paPaymentList[0].fspName;
    return result;
  }

  private getMultipliedAmount(amount: number, multiplier: number): number {
    return amount * (multiplier || 1);
  }

  public async sendIndividualPayment(
    paymentInfo: PaPaymentDataDto,
    useWhatsapp: boolean,
    amount: number,
    payment: number,
  ): Promise<PaTransactionResultDto> {
    const paResult = new PaTransactionResultDto();
    paResult.referenceId = paymentInfo.referenceId;

    const intersolveRefPos = this.getIntersolveRefPos();
    const calculatedAmount = this.getMultipliedAmount(
      amount,
      paymentInfo.paymentAmountMultiplier,
    );
    paResult.calculatedAmount = calculatedAmount;
    const voucherInfo = await this.issueVoucher(
      calculatedAmount,
      intersolveRefPos,
    );
    voucherInfo.refPos = intersolveRefPos;

    if (voucherInfo.resultCode == IntersolveResultCode.Ok) {
      voucherInfo.voucher = await this.storeVoucher(
        voucherInfo,
        paymentInfo,
        payment,
        calculatedAmount,
      );
      paResult.status = StatusEnum.success;
    } else {
      paResult.status = StatusEnum.error;
      paResult.message =
        'Creating intersolve voucher failed. Status code: ' +
        (voucherInfo.resultCode ? voucherInfo.resultCode : 'unknown') +
        ' message: ' +
        (voucherInfo.resultDescription
          ? voucherInfo.resultDescription
          : 'unknown');
      await this.cancelAndDeleteVoucher(
        voucherInfo.cardId,
        voucherInfo.transactionId,
      );
      return paResult;
    }

    // If no whatsapp: return early
    if (!useWhatsapp) {
      paResult.status = StatusEnum.success;
      return paResult;
    }

    // Continue with whatsapp:
    return await this.sendWhatsapp(paymentInfo, voucherInfo, paResult, amount);
  }

  private getIntersolveRefPos(): number {
    return parseInt(crypto.randomBytes(5).toString('hex'), 16);
  }

  private async issueVoucher(
    amount: number,
    intersolveRefPos: number,
  ): Promise<IntersolveIssueCardResponse> {
    const amountInCents = amount * 100;
    return await this.intersolveApiService.issueCard(
      amountInCents,
      intersolveRefPos,
    );
  }

  private async storeVoucher(
    voucherInfo: IntersolveIssueCardResponse,
    paPaymentData: PaPaymentDataDto,
    payment: number,
    amount: number,
  ): Promise<IntersolveBarcodeEntity> {
    const barcodeData = await this.storeBarcodeData(
      voucherInfo.cardId,
      voucherInfo.pin,
      paPaymentData.paymentAddress,
      payment,
      amount,
    );

    await this.imageCodeService.createBarcodeExportVouchers(
      barcodeData,
      paPaymentData.referenceId,
    );

    return barcodeData;
  }

  private async cancelVoucher(
    voucherInfo: IntersolveIssueCardResponse,
  ): Promise<void> {
    if (voucherInfo.transactionId) {
      await this.intersolveApiService.cancel(
        voucherInfo.cardId,
        voucherInfo.transactionId,
      );
    } else {
      await this.intersolveApiService.cancelTransactionByRefPos(
        voucherInfo.refPos,
      );
    }
  }

  private async sendWhatsapp(
    paymentInfo: PaPaymentDataDto,
    voucherInfo: IntersolveIssueCardResponse,
    paResult: PaTransactionResultDto,
    amount: number,
  ): Promise<PaTransactionResultDto> {
    const transferResult = await this.sendVoucherWhatsapp(
      paymentInfo,
      voucherInfo,
      amount,
    );

    if (transferResult.status !== StatusEnum.error) {
      paResult = await this.processSucceededWhatsappResult(
        paResult,
        transferResult,
      );
    } else {
      paResult = await this.processFailedWhatsappResult(
        paResult,
        transferResult,
        voucherInfo,
      );
    }
    return paResult;
  }

  public async sendVoucherWhatsapp(
    paymentInfo: PaPaymentDataDto,
    voucherInfo: IntersolveIssueCardResponse,
    amount: number,
  ): Promise<PaTransactionResultDto> {
    const result = new PaTransactionResultDto();
    result.referenceId = paymentInfo.referenceId;

    const language = await this.getLanguage(paymentInfo.referenceId);
    const program = await getRepository(ProgramEntity).findOne(this.programId);
    let whatsappPayment = program.notifications[language]['whatsappPayment'];
    const calculatedAmount = this.getMultipliedAmount(
      amount,
      paymentInfo.paymentAmountMultiplier,
    );
    whatsappPayment = whatsappPayment.split('{{1}}').join(calculatedAmount);

    const registration = await this.registrationRepository.findOne({
      select: ['id'],
      where: { referenceId: paymentInfo.referenceId },
    });
    await this.whatsappService
      .sendWhatsapp(
        whatsappPayment,
        paymentInfo.paymentAddress,
        IntersolvePayoutStatus.InitialMessage,
        null,
        registration.id,
      )
      .then(
        async response => {
          const messageSid = response;
          await this.storeTransactionResult(
            voucherInfo.voucher.payment,
            voucherInfo.voucher.amount,
            registration.id,
            1,
            StatusEnum.waiting,
            null,
            messageSid,
          );

          result.status = StatusEnum.waiting;
          result.customData = {
            messageSid: messageSid,
            IntersolvePayoutStatus: IntersolvePayoutStatus.InitialMessage,
          };
        },
        error => {
          result.message = error;
          result.status = StatusEnum.error;
        },
      );
    return result;
  }

  private async getLanguage(referenceId: string): Promise<string> {
    return (
      (
        await this.registrationRepository.findOne({
          where: { referenceId: referenceId, preferredLanguage: Not(IsNull()) },
        })
      )?.preferredLanguage || 'en'
    );
  }

  private async processSucceededWhatsappResult(
    transactionResult: PaTransactionResultDto,
    transferResult: PaTransactionResultDto,
  ): Promise<PaTransactionResultDto> {
    transactionResult.status = transferResult.status;
    transactionResult.customData = transferResult.customData;
    return transactionResult;
  }

  private async processFailedWhatsappResult(
    transactionResult: PaTransactionResultDto,
    transferResult: PaTransactionResultDto,
    voucherInfo: IntersolveIssueCardResponse,
  ): Promise<PaTransactionResultDto> {
    transactionResult.status = StatusEnum.error;
    transactionResult.message =
      'Voucher(s) created, but something went wrong in sending voucher.\n' +
      transferResult.message;

    // If sending failed cancel and delete voucher again
    await this.cancelAndDeleteVoucher(
      voucherInfo.cardId,
      voucherInfo.transactionId,
    );

    return transactionResult;
  }

  private async storeBarcodeData(
    cardNumber: string,
    pin: string,
    phoneNumber: string,
    payment: number,
    amount: number,
  ): Promise<IntersolveBarcodeEntity> {
    const barcodeData = new IntersolveBarcodeEntity();
    barcodeData.barcode = cardNumber;
    barcodeData.pin = pin.toString();
    barcodeData.whatsappPhoneNumber = phoneNumber;
    barcodeData.send = false;
    barcodeData.payment = payment;
    barcodeData.amount = amount;
    return this.intersolveBarcodeRepository.save(barcodeData);
  }

  public async processStatus(
    statusCallbackData: TwilioStatusCallbackDto,
  ): Promise<void> {
    const transaction = await getRepository(TransactionEntity)
      .createQueryBuilder('transaction')
      .select(['transaction.id', 'transaction.payment'])
      .leftJoinAndSelect('transaction.registration', 'registration')
      .where('transaction.customData ::jsonb @> :customData', {
        customData: {
          messageSid: statusCallbackData.MessageSid,
        },
      })
      .getOne();
    if (!transaction) {
      // If no transaction found, it cannot (and should not have to) be updated
      return;
    }

    const succesStatuses = [TwilioStatus.delivered, TwilioStatus.read];
    const failStatuses = [TwilioStatus.undelivered, TwilioStatus.failed];
    let status: string;
    if (succesStatuses.includes(statusCallbackData.MessageStatus)) {
      status = StatusEnum.success;
    } else if (failStatuses.includes(statusCallbackData.MessageStatus)) {
      const registration = await this.registrationRepository.findOne({
        where: { id: transaction.registration.id },
        relations: ['images', 'images.barcode'],
      });
      // NOTE: array.find yields 1st element, but this is line with 1 voucher per payment
      const voucher = registration.images.find(
        i => i.barcode.payment === transaction.payment,
      ).barcode;
      const intersolveRequest = await this.intersolveRequestRepository.findOne({
        where: { cardId: voucher.barcode },
      });

      this.cancelAndDeleteVoucher(
        voucher.barcode,
        String(intersolveRequest.transactionId),
      );
      status = StatusEnum.error;
    } else {
      // For other statuses, no update needed
      return;
    }

    await this.transactionRepository.update(
      { id: transaction.id },
      {
        status: status,
        errorMessage:
          status === StatusEnum.error
            ? (statusCallbackData.ErrorMessage || '') +
              ' (ErrorCode: ' +
              statusCallbackData.ErrorCode +
              ')'
            : null,
      },
    );
  }

  public async exportVouchers(
    referenceId: string,
    payment: number,
  ): Promise<any> {
    const voucher = await this.getVoucher(referenceId, payment);

    return voucher.image;
  }

  private async getVoucher(referenceId: string, payment: number): Promise<any> {
    const registration = await this.registrationRepository.findOne({
      where: { referenceId: referenceId },
      relations: ['images', 'images.barcode'],
    });
    if (!registration) {
      throw new HttpException(
        'PA with this referenceId not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const voucher = registration.images.find(
      image => image.barcode.payment === payment,
    );
    if (!voucher) {
      throw new HttpException(
        'Voucher not found. Maybe this payment was not (yet) made to this PA.',
        HttpStatus.NOT_FOUND,
      );
    }
    return voucher;
  }

  public async getInstruction(): Promise<any> {
    const intersolveInstructionsEntity = await this.intersolveInstructionsRepository.findOne();

    if (!intersolveInstructionsEntity) {
      throw new HttpException(
        'Image not found. Please upload an image using POST and try again.',
        HttpStatus.NOT_FOUND,
      );
    }

    return intersolveInstructionsEntity.image;
  }

  public async postInstruction(instructionsFileBlob): Promise<any> {
    let intersolveInstructionsEntity = await this.intersolveInstructionsRepository.findOne();

    if (!intersolveInstructionsEntity) {
      intersolveInstructionsEntity = new IntersolveInstructionsEntity();
    }

    intersolveInstructionsEntity.image = instructionsFileBlob.buffer;

    this.intersolveInstructionsRepository.save(intersolveInstructionsEntity);
  }

  public async cancelAndDeleteVoucher(
    cardId: string,
    transactionId: string,
  ): Promise<void> {
    await this.intersolveApiService.cancel(cardId, transactionId);
    const barcode = await this.intersolveBarcodeRepository.findOne({
      where: { barcode: cardId },
      relations: ['image'],
    });
    if (barcode) {
      for (const image of barcode.image) {
        await this.imageCodeService.removeImageExportVoucher(image);
      }
      await this.intersolveBarcodeRepository.remove(barcode);
    }
  }

  public async getVoucherBalance(
    referenceId: string,
    payment: number,
  ): Promise<number> {
    const voucher = await this.getVoucher(referenceId, payment);
    return await this.getBalance(voucher.barcode);
  }

  private async getBalance(
    intersolveBarcode: IntersolveBarcodeEntity,
  ): Promise<number> {
    const getCard = await this.intersolveApiService.getCard(
      intersolveBarcode.barcode,
      intersolveBarcode.pin,
    );
    const realBalance = getCard.balance / getCard.balanceFactor;
    return realBalance;
  }

  public async getUnusedVouchers(): Promise<UnusedVoucherDto[]> {
    const maxId = (
      await this.intersolveBarcodeRepository.findOne({
        order: { id: 'DESC' },
      })
    )?.id;

    const unusedVouchers = [];
    let id = 1;

    // Run this in batches of 1,000 as it is performance-heavy
    while (id <= maxId) {
      const previouslyUnusedVouchers = await this.intersolveBarcodeRepository.find(
        {
          where: {
            balanceUsed: false,
            id: Between(id, id + 1000 - 1),
          },
          relations: ['image', 'image.registration'],
        },
      );

      for await (const voucher of previouslyUnusedVouchers) {
        const balance = await this.getBalance(voucher);

        if (balance === voucher.amount) {
          let unusedVoucher = new UnusedVoucherDto();
          unusedVoucher.payment = voucher.payment;
          unusedVoucher.issueDate = voucher.created;
          unusedVoucher.whatsappPhoneNumber = voucher.whatsappPhoneNumber;
          unusedVoucher.phoneNumber = voucher.image[0].registration.phoneNumber;
          unusedVoucher.customData = voucher.image[0].registration.customData;

          unusedVouchers.push(unusedVoucher);
        } else {
          voucher.balanceUsed = true;
          this.intersolveBarcodeRepository.save(voucher);
        }
      }

      id += 1000;
    }

    return unusedVouchers;
  }

  public async storeTransactionResult(
    paymentNr: number,
    amount: number,
    registrationId: number,
    transactionStep: number,
    status: StatusEnum,
    errorMessage: string,
    messageSid?: string,
  ): Promise<void> {
    const transactionResultDto = await this.createTransactionResult(
      amount,
      registrationId,
      transactionStep,
      status,
      errorMessage,
      messageSid,
    );
    this.transactionsService.storeTransaction(
      transactionResultDto,
      this.programId,
      paymentNr,
      transactionStep,
    );
  }

  public async createTransactionResult(
    amount: number,
    registrationId: number,
    transactionStep: number,
    status: StatusEnum,
    errorMessage: string,
    messageSid?: string,
  ): Promise<PaTransactionResultDto> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['fsp', 'program'],
    });

    const transactionResult = new PaTransactionResultDto();
    transactionResult.calculatedAmount = amount;
    transactionResult.date = new Date();
    transactionResult.referenceId = registration.referenceId;

    transactionResult.message = errorMessage;
    transactionResult.customData = JSON.parse(JSON.stringify({}));
    if (messageSid) {
      transactionResult.customData['messageSid'] = messageSid;
    }
    if (registration.fsp.fsp === FspName.intersolve) {
      transactionResult.customData['IntersolvePayoutStatus'] =
        transactionStep === 1
          ? IntersolvePayoutStatus.InitialMessage
          : IntersolvePayoutStatus.VoucherSent;
    }

    transactionResult.status = status;

    if (registration.fsp.fsp === FspName.intersolve) {
      transactionResult.fspName = FspName.intersolve;
    }
    if (registration.fsp.fsp === FspName.intersolveNoWhatsapp) {
      transactionResult.fspName = FspName.intersolveNoWhatsapp;
    }
    return transactionResult;
  }
}
