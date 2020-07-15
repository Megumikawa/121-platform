import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { PaDataAttribute } from 'src/app/models/pa-data.model';
import {
  AnswerType,
  Program,
  ProgramAttribute,
  ProgramCriterium,
  ProgramCriteriumOption,
} from 'src/app/models/program.model';
import {
  Answer,
  Question,
  QuestionOption,
} from 'src/app/models/q-and-a.models';
import { ConversationService } from 'src/app/services/conversation.service';
import { IonicStorageTypes } from 'src/app/services/iconic-storage-types.enum';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';
import { SessionStorageService } from 'src/app/services/session-storage.service';
import { TranslatableStringService } from 'src/app/services/translatable-string.service';
import { ValidationComponents } from '../validation-components.enum';
import { ValidationComponent } from '../validation-components.interface';

@Component({
  selector: 'app-validate-program',
  templateUrl: './validate-program.component.html',
  styleUrls: ['./validate-program.component.scss'],
})
export class ValidateProgramComponent implements ValidationComponent {
  public did: string;
  public programId: number;
  private currentProgram: Program;
  public programCredentialIssued = false;
  public verificationPostponed = false;

  public questions: Question[];
  public answerTypes = AnswerType;
  public answers: any = {};

  public hasAnswered: boolean;
  public hasChangedAnswers = true;
  public dobFeedback = false;

  public ionicStorageTypes = IonicStorageTypes;

  constructor(
    public translatableString: TranslatableStringService,
    public programsService: ProgramsServiceApiService,
    public conversationService: ConversationService,
    public sessionStorageService: SessionStorageService,
    public router: Router,
    public ionContent: IonContent,
    private storage: Storage,
  ) {}

  async ngOnInit() {
    const paData = await this.getPaData();
    this.did = paData[0].did;
    this.programId = paData[0].programId;

    await this.getProgramQuestions();
    await this.initialAnswers(paData);

    this.verificationPostponed = false;
    this.ionContent.scrollToBottom(300);
  }

  private async getPaData(): Promise<PaDataAttribute[]> {
    const paDataRaw = await this.sessionStorageService.retrieve(
      this.sessionStorageService.type.paData,
    );
    return JSON.parse(paDataRaw);
  }

  private async getProgramQuestions() {
    this.currentProgram = await this.getCurrentProgram();
    this.questions = this.buildQuestions(this.currentProgram.customCriteria);
  }

  private async getCurrentProgram(): Promise<Program> {
    let program = await this.getCurrentProgramOffline(this.programId);
    if (!program) {
      program = await this.programsService.getProgramById(this.programId);
    }
    return program;
  }

  private async getCurrentProgramOffline(programId: number): Promise<Program> {
    const programs = await this.storage.get(this.ionicStorageTypes.myPrograms);
    if (programs) {
      for (const program of programs) {
        if (program.id === programId) {
          return program;
        }
      }
    }
  }

  private buildQuestions(customCriteria: ProgramCriterium[]) {
    return customCriteria.map(
      (criterium): Question => {
        return {
          code: criterium.criterium,
          answerType: criterium.answerType,
          label: this.translatableString.get(criterium.label),
          options: !criterium.options
            ? null
            : this.buildOptions(criterium.options),
        };
      },
    );
  }

  private buildOptions(optionSet: ProgramCriteriumOption[]): QuestionOption[] {
    return optionSet.map((option) => {
      return {
        value: option.option,
        label: this.translatableString.get(option.label),
      };
    });
  }

  private getQuestionByCode(questionCode: string): Question {
    const result = this.questions.find((question: Question) => {
      return question.code === questionCode;
    });

    return result;
  }

  private getAnswerOptionLabelByValue(
    options: QuestionOption[],
    answerValue: string,
  ) {
    const option = options.find((item: QuestionOption) => {
      return item.value === answerValue;
    });

    return option ? option.label : '';
  }

  private buildAnswer(questionCode: string, answerValue: string) {
    const question = this.getQuestionByCode(questionCode);
    const answer: Answer = {
      code: questionCode,
      value: answerValue,
      label: answerValue,
    };

    // Convert the answerValue to a human-readable label
    if (question.answerType === AnswerType.Enum) {
      answer.label = this.getAnswerOptionLabelByValue(
        question.options,
        answerValue,
      );
    }

    this.answers[questionCode] = answer;
  }

  public initialAnswers(answers: PaDataAttribute[]) {
    for (const answerItem of answers) {
      this.buildAnswer(answerItem.attribute, answerItem.answer);
    }
  }

  public change() {
    console.log('change: ');
    this.hasAnswered = false;
    this.hasChangedAnswers = true;
  }

  public submit() {
    if (!this.answers.dob) {
      this.dobFeedback = true;
      return;
    }
    this.hasAnswered = true;
    this.hasChangedAnswers = false;
    this.dobFeedback = false;
    console.log('this.programCredentialIssued: ', this.programCredentialIssued);
  }

  public postponeVerification() {
    this.verificationPostponed = true;
  }

  private createAttributes(answers: Answer[]): ProgramAttribute[] {
    const attributes: ProgramAttribute[] = [];

    answers.forEach((item: Answer) => {
      attributes.push({
        attributeId: 0,
        attribute: item.code,
        answer: item.value,
      });
    });

    return attributes;
  }

  public async validateAttributes() {
    const attributes = this.createAttributes(Object.values(this.answers));
    await this.storeCredentialOffline(attributes);
    this.programCredentialIssued = true;
    // this.answers = {};
    this.complete();
  }

  public async storeCredentialOffline(attributes: ProgramAttribute[]) {
    const credential = {
      did: this.did,
      programId: this.programId,
      attributes,
    };
    let storedCredentials = await this.storage.get(
      this.ionicStorageTypes.credentials,
    );
    if (!storedCredentials) {
      storedCredentials = [];
    }

    // If offline DID is already stored delete it from array first
    storedCredentials = storedCredentials.filter(
      (storedCredential) => !(storedCredential.did === this.did),
    );

    storedCredentials.push(credential);
    await this.storage.set(
      this.ionicStorageTypes.credentials,
      storedCredentials,
    );
  }

  getNextSection() {
    return ValidationComponents.validateFsp;
  }

  complete() {
    this.conversationService.onSectionCompleted({
      name: ValidationComponents.validateProgram,
      data: {},
      next: this.getNextSection(),
    });
  }
}
