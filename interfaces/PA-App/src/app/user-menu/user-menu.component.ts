import { Component, OnInit } from '@angular/core';
import {
  AlertController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import {
  LoggingEvent,
  LoggingEventCategory,
} from 'src/app/models/logging-event.enum';
import { LoggingService } from 'src/app/services/logging.service';
import { PaDataService } from 'src/app/services/padata.service';

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
})
export class UserMenuComponent implements OnInit {
  public isLoggedIn = false;
  public username: string;
  private loadingDelete: HTMLIonLoadingElement;

  constructor(
    private modalController: ModalController,
    private paData: PaDataService,
    private translate: TranslateService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private logger: LoggingService,
  ) {}

  async ngOnInit() {
    this.isLoggedIn = this.paData.hasAccount;
    this.username = await this.paData.getUsername();
  }

  close() {
    this.modalController.dismiss();
  }

  logout() {
    this.paData.logout();
    this.close();
    this.logger.logEvent(LoggingEventCategory.ui, LoggingEvent.logout);
    window.location.reload();
  }

  async deleteData() {
    this.paData.deleteData().then(() => {
      this.logout();
    });
  }

  public async presentLoadingDelete() {
    this.loadingDelete = await this.loadingController.create({});
    await this.loadingDelete.present();
  }

  public async showDeleteResult(
    resultMessage: string,
    logoutOnDismiss = false,
  ) {
    const alert = await this.alertController.create({
      message: resultMessage,
      buttons: [
        {
          text: this.translate.instant('shared.close-button'),
        },
      ],
    });

    if (logoutOnDismiss) {
      alert.onDidDismiss().then(() => this.logout());
    }

    await alert.present();
  }
}
