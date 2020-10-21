import { WhatsappModule } from './../../notifications/whatsapp/whatsapp.module';
import { AfricasTalkingService } from './africas-talking.service';
import { Module, HttpModule } from '@nestjs/common';
import { FspService } from './fsp.service';
import { FspController } from './fsp.controller';
import { AfricasTalkingApiService } from './api/africas-talking.api.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramEntity } from '../program/program.entity';
import { ConnectionEntity } from '../../sovrin/create-connection/connection.entity';
import { FinancialServiceProviderEntity } from './financial-service-provider.entity';
import { TransactionEntity } from '../program/transactions.entity';
import { FspCallLogEntity } from './fsp-call-log.entity';
import { SoapService } from './api/soap.service';
import { IntersolveApiService } from './api/instersolve.api.service';
import { IntersolveService } from './intersolve.service';
import { AfricasTalkingNotificationEntity } from './africastalking-notification.entity';
import { IntersolveBarcodeEntity } from './intersolve-barcode.entity';

@Module({
  imports: [
    HttpModule,
    WhatsappModule,
    TypeOrmModule.forFeature([
      ProgramEntity,
      ConnectionEntity,
      FinancialServiceProviderEntity,
      TransactionEntity,
      FspCallLogEntity,
      AfricasTalkingNotificationEntity,
      IntersolveBarcodeEntity,
    ]),
  ],
  providers: [
    AfricasTalkingService,
    FspService,
    AfricasTalkingApiService,
    IntersolveService,
    IntersolveApiService,
    SoapService,
  ],
  controllers: [FspController],
  exports: [
    AfricasTalkingService,
    FspService,
    AfricasTalkingApiService,
    IntersolveService,
    IntersolveApiService,
    SoapService,
  ],
})
export class FspModule {}
