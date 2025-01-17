import { RegistrationEntity } from './../../registration/registration.entity';
import { ProgramEntity } from './../../programs/program.entity';
import { EXTERNAL_API } from './../../config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository } from 'typeorm';
import { TwilioMessageEntity, NotificationType } from '../twilio.entity';
import { twilioClient } from '../twilio.client';

@Injectable()
export class SmsService {
  @InjectRepository(TwilioMessageEntity)
  private readonly twilioMessageRepository: Repository<TwilioMessageEntity>;

  public constructor() {}

  public async notifyBySms(
    registrationId: number,
    recipientPhoneNr: string,
    language: string,
    programId: number,
    message?: string,
    key?: string,
  ): Promise<void> {
    if (recipientPhoneNr) {
      if (!message && !key) {
        throw new HttpException(
          'A message or a key should be supplied.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const smsText =
        message || (await this.getSmsText(language, key, programId));
      this.sendSms(smsText, recipientPhoneNr, registrationId);
    }
  }

  public async sendSms(
    message: string,
    recipientPhoneNr: string,
    registrationId: number,
  ): Promise<void> {
    // Overwrite recipient phone number for testing phase
    twilioClient.messages
      .create({
        body: message,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
        statusCallback: EXTERNAL_API.smsStatus,
        to: recipientPhoneNr,
      })
      .then(message => this.storeSendSms(message, registrationId))
      .catch(err => console.log('Error from Twilio:', err));
  }

  public async getSmsText(
    language: string,
    key: string,
    programId: number,
  ): Promise<string> {
    const program = await getRepository(ProgramEntity).findOne(programId);
    return program.notifications[language][key];
  }

  public storeSendSms(message, registrationId: number): void {
    const twilioMessage = new TwilioMessageEntity();
    twilioMessage.accountSid = message.accountSid;
    twilioMessage.body = message.body;
    twilioMessage.to = message.to;
    twilioMessage.from = message.messagingServiceSid;
    twilioMessage.sid = message.sid;
    twilioMessage.status = message.status;
    twilioMessage.type = NotificationType.Sms;
    twilioMessage.dateCreated = message.dateCreated;
    twilioMessage.registrationId = registrationId;
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
      { status: callbackData.SmsStatus },
    );
  }
}
