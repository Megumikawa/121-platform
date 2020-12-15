import { ConnectionEntity } from './../../sovrin/create-connection/connection.entity';
import { IntersolvePayoutStatus } from './../../programs/fsp/api/enum/intersolve-payout-status.enum';
import { EXTERNAL_API } from '../../config';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository, Like } from 'typeorm';
import { TwilioMessageEntity, NotificationType } from '../twilio.entity';
import { twilioClient } from '../twilio.client';
import { ProgramEntity } from '../../programs/program/program.entity';
import { ImageCodeService } from '../imagecode/image-code.service';
import { IntersolveBarcodeEntity } from '../../programs/fsp/intersolve-barcode.entity';
import { TransactionEntity } from '../../programs/program/transactions.entity';
import { StatusEnum } from '../../shared/enum/status.enum';

@Injectable()
export class WhatsappService {
  @InjectRepository(IntersolveBarcodeEntity)
  private readonly intersolveBarcodeRepository: Repository<
    IntersolveBarcodeEntity
  >;
  @InjectRepository(TwilioMessageEntity)
  private readonly twilioMessageRepository: Repository<TwilioMessageEntity>;
  @InjectRepository(TransactionEntity)
  public transactionRepository: Repository<TransactionEntity>;
  @InjectRepository(ConnectionEntity)
  private readonly connectionRepository: Repository<ConnectionEntity>;

  @InjectRepository(ProgramEntity)
  private readonly programRepository: Repository<ProgramEntity>;

  private readonly programId = 1;
  private readonly language = 'en';

  public constructor(private readonly imageCodeService: ImageCodeService) {}

  public async notifyByWhatsapp(
    recipientPhoneNr: string,
    language: string,
    key: string,
    programId: number,
  ): Promise<void> {
    if (recipientPhoneNr) {
      const whatsappText = await this.getWhatsappText(language, key, programId);
      await this.sendWhatsapp(whatsappText, recipientPhoneNr, null);
    }
  }

  public async sendWhatsapp(
    message: string,
    recipientPhoneNr: string,
    mediaUrl: null | string,
  ): Promise<void> {
    if (mediaUrl) {
      twilioClient.messages
        .create({
          body: message,
          messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
          from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
          statusCallback: EXTERNAL_API.callbackUrlWhatsapp,
          to: 'whatsapp:' + recipientPhoneNr,
          mediaUrl: mediaUrl,
        })
        .then(message => {
          this.storeSendWhatsapp(message);
        })
        .catch(err => console.log('Error twillio', err));
    } else {
      const result = await twilioClient.messages.create({
        body: message,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
        from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
        statusCallback: EXTERNAL_API.callbackUrlWhatsapp,
        to: 'whatsapp:' + recipientPhoneNr,
      });
      await this.storeSendWhatsapp(result);
    }
  }

  public async getWhatsappText(
    language: string,
    key: string,
    programId: number,
  ): Promise<string> {
    const program = await getRepository(ProgramEntity).findOne(programId);
    return program.notifications[language][key];
  }

  public storeSendWhatsapp(message): void {
    console.log('message: ', message);
    const twilioMessage = new TwilioMessageEntity();
    twilioMessage.accountSid = message.accountSid;
    twilioMessage.body = message.body;
    twilioMessage.to = message.to;
    twilioMessage.from = message.messagingServiceSid;
    twilioMessage.sid = message.sid;
    twilioMessage.status = message.status;
    twilioMessage.type = NotificationType.Whatsapp;
    twilioMessage.dateCreated = message.dateCreated;
    this.twilioMessageRepository.save(twilioMessage);
  }

  public async findOne(sid: string): Promise<TwilioMessageEntity> {
    const findOneOptions = {
      sid: sid,
    };
    return await this.twilioMessageRepository.findOne(findOneOptions);
  }

  public async statusCallback(callbackData): Promise<void> {
    await this.twilioMessageRepository.update(
      { sid: callbackData.MessageSid },
      { status: callbackData.MessageStatus },
    );
  }

  public async handleIncoming(callbackData): Promise<void> {
    const fromNumber = callbackData.From.replace('whatsapp:+', '');

    const program = await getRepository(ProgramEntity).findOne(this.programId);
    const intersolveBarcode = await this.intersolveBarcodeRepository.findOne({
      where: { whatsappPhoneNumber: fromNumber, send: false },
    });
    if (intersolveBarcode) {
      const mediaUrl = await this.imageCodeService.createVoucherUrl(
        intersolveBarcode,
      );
      await this.sendWhatsapp(
        program.notifications[this.language]['whatsappVoucher'],
        intersolveBarcode.whatsappPhoneNumber,
        mediaUrl,
      );
      await this.sendWhatsapp(
        '',
        intersolveBarcode.whatsappPhoneNumber,
        EXTERNAL_API.voucherInstructionsUrl,
      );

      intersolveBarcode.send = true;
      await this.intersolveBarcodeRepository.save(intersolveBarcode);
      await this.insertTransactionIntersolve(intersolveBarcode);
    } else {
      const whatsappReply =
        program.notifications[this.language]['whatsappReply'];
      await this.sendWhatsapp(whatsappReply, fromNumber, null);
    }
  }

  public async insertTransactionIntersolve(
    intersolveBarcode: IntersolveBarcodeEntity,
  ): Promise<void> {
    const transaction = new TransactionEntity();
    transaction.status = StatusEnum.success;
    transaction.installment = intersolveBarcode.installment;
    transaction.amount = intersolveBarcode.amount;
    transaction.customData = JSON.parse(
      JSON.stringify({
        IntersolvePayoutStatus: IntersolvePayoutStatus.VoucherSent,
      }),
    );
    const whatsAppSearch = intersolveBarcode.whatsappPhoneNumber;
    const connection = await this.connectionRepository.findOne({
      where: `"customData" ILIKE '${whatsAppSearch}%'`,
    });
    transaction.connection = connection;
    transaction.program = await this.programRepository.findOne(1);
    transaction.financialServiceProvider = connection.fsp;
    await this.transactionRepository.save(transaction);
  }
}
