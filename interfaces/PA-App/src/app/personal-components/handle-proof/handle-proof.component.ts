import { Component } from '@angular/core';

import { ConversationService } from 'src/app/services/conversation.service';
import { StorageService } from 'src/app/services/storage.service';
import { UpdateService } from 'src/app/services/update.service';

import { PaAccountApiService } from 'src/app/services/pa-account-api.service';
import { UserImsApiService } from 'src/app/services/user-ims-api.service';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';

import { PersonalComponent } from '../personal-component.class';

enum InclusionStates {
  included = 'inlcluded',
  excluded = 'excluded',
  unavailable = 'unavailable'
}

@Component({
  selector: 'app-handle-proof',
  templateUrl: './handle-proof.component.html',
  styleUrls: ['./handle-proof.component.scss'],
})
export class HandleProofComponent extends PersonalComponent {

  private programId: number;
  private did: string;
  private wallet: any;
  private correlation: any;

  public inclusionStatus: string;
  public inclusionStatusPositive = false;
  public inclusionStatusNegative = false;

  constructor(
    public conversationService: ConversationService,
    public storageService: StorageService,
    public updateService: UpdateService,
    public programService: ProgramsServiceApiService,
    public paAccountApiService: PaAccountApiService,
    public userImsApiService: UserImsApiService,
  ) {
    super();

    this.conversationService.startLoading();
  }

  ngAfterContentInit() {
    this.handleProof();
  }

  async handleProof() {
    console.log('handleProof');

    await this.gatherData();

    // Create proof
    const proofRequest = await this.programService.getProofRequest(this.programId);
    const proof = await this.userImsApiService.getProofFromWallet(proofRequest, this.wallet, this.correlation);

    const status = await this.sendProof(proof);


    if (status === 'done') {
      this.inclusionStatus = await this.getInclusionStatus();
    }

    if (this.inclusionStatus === InclusionStates.included) {
      this.inclusionStatusPositive = true;
    } else if (this.inclusionStatus === InclusionStates.excluded) {
      this.inclusionStatusNegative = true;
    }

    this.conversationService.stopLoading();
  }

  private async gatherData() {
    this.programId = await this.storageService.retrieve(this.storageService.type.programId);
    this.did = await this.storageService.retrieve(this.storageService.type.did);
    this.wallet = JSON.parse(await this.storageService.retrieve(this.storageService.type.wallet));
    this.correlation = JSON.parse(await this.storageService.retrieve(this.storageService.type.correlation));
  }

  async sendProof(proof: string): Promise<string> {
    console.log('sendProof');
    const did = await this.storageService.retrieve(this.storageService.type.did);
    const programId = Number(await this.storageService.retrieve(this.storageService.type.programId));
    const response = await this.programService.postIncludeMe(did, programId, proof).toPromise();
    return response.status;
  }

  async getInclusionStatus(): Promise<string> {
    console.log('getInclusionStatus');
    const did = await this.storageService.retrieve(this.storageService.type.did);
    const programId = await this.storageService.retrieve(this.storageService.type.programId);
    const response = await this.programService.postInclusionStatus(did, programId).toPromise();
    return response.status;
  }
}
