import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { FormsModule } from '@angular/forms';

import { ConversationService } from '../services/conversation.service';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { ViewAppointmentsComponent } from './view-appointments/view-appointments.component';
import { ScanQrComponent } from './scan-qr/scan-qr.component';
import { ValidateProgramComponent } from './validate-program/validate-program.component';
import { DownloadDataComponent } from './download-data/download-data.component';
import { UploadDataComponent } from './upload-data/upload-data.component';
import { ValidateFspComponent } from './validate-fsp/validate-fsp.component';

@NgModule({
  declarations: [
    MainMenuComponent,
    ViewAppointmentsComponent,
    ScanQrComponent,
    ValidateProgramComponent,
    ValidateFspComponent,
    DownloadDataComponent,
    UploadDataComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule
  ],
  entryComponents: [
    MainMenuComponent,
    ViewAppointmentsComponent,
    ScanQrComponent,
    ValidateProgramComponent,
    ValidateFspComponent,
    DownloadDataComponent,
    UploadDataComponent
  ],
  exports: [
    MainMenuComponent,
    ViewAppointmentsComponent,
    ScanQrComponent,
    ValidateProgramComponent,
    ValidateFspComponent,
    DownloadDataComponent,
    UploadDataComponent
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  providers: [ConversationService]
})
export class ValidationComponentsModule { }

