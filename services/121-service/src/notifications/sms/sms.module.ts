import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddlewareTwilio } from '../auth.middlewareTwilio';
import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
  NestModule,
} from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { TwilioMessageEntity } from '../twilio.entity';
import { API_PATHS } from '../../config';

@Module({
  imports: [TypeOrmModule.forFeature([TwilioMessageEntity])],
  providers: [SmsService],
  controllers: [SmsController],
  exports: [SmsService],
})
export class SmsModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddlewareTwilio).forRoutes({
      path: API_PATHS.smsStatus,
      method: RequestMethod.POST,
    });
  }
}
