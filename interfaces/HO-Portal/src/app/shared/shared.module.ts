import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { HeaderComponent } from '../components/header/header.component';
import { UserStateComponent } from '../components/user-state/user-state.component';
import { ExportListComponent } from '../program/export-list/export-list.component';
import { PhaseNavigationComponent } from '../program/phase-navigation/phase-navigation.component';
import { PhaseNextComponent } from '../program/phase-next/phase-next.component';
import { ProgramPeopleAffectedComponent } from '../program/program-people-affected/program-people-affected.component';
import { TestPaymentComponent } from '../program/test-payment/test-payment.component';
import { ConfirmPromptComponent } from './confirm-prompt/confirm-prompt.component';
import { PasswordToggleInputComponent } from './password-toggle-input/password-toggle-input.component';

@NgModule({
  declarations: [
    ConfirmPromptComponent,
    PasswordToggleInputComponent,
    HeaderComponent,
    UserStateComponent,
    PhaseNextComponent,
    PhaseNavigationComponent,
    ProgramPeopleAffectedComponent,
    ExportListComponent,
    TestPaymentComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule,
    TranslateModule.forChild(),
    NgxDatatableModule,
  ],
  exports: [
    ConfirmPromptComponent,
    PasswordToggleInputComponent,
    HeaderComponent,
    UserStateComponent,
    PhaseNextComponent,
    PhaseNavigationComponent,
    ProgramPeopleAffectedComponent,
    ExportListComponent,
    TestPaymentComponent,
    RouterModule,
    TranslateModule,
    NgxDatatableModule,
  ],
})
export class SharedModule {}
