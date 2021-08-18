import { LookupService } from '../../notifications/lookup/lookup.service';
import { ValidationIssueDataDto } from './dto/validation-issue-data.dto';
import {
  Injectable,
  HttpException,
  Inject,
  forwardRef,
  HttpStatus,
} from '@nestjs/common';
import { ProgramEntity } from '../../programs/program/program.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, getRepository } from 'typeorm';
import { ProgramService } from '../../programs/program/program.service';
import { PrefilledAnswerDto } from './dto/prefilled-answers.dto';
import { ValidationDataAttributesEntity } from './validation-attributes.entity';
import { ConnectionEntity } from '../connection.entity';
import { UserEntity } from '../../user/user.entity';
import { DownloadData } from './interfaces/download-data.interface';
import {
  FspAnswersAttrInterface,
  AnswerSet,
} from '../../programs/fsp/fsp-interface';
import { FspAttributeEntity } from '../../programs/fsp/fsp-attribute.entity';
import { CustomCriterium } from 'src/programs/program/custom-criterium.entity';
import {
  AnswerTypes,
  CustomDataAttributes,
} from './dto/custom-data-attributes';
import { RegistrationEntity } from '../../registration/registration.entity';

@Injectable()
export class ValidationDataService {
  @InjectRepository(RegistrationEntity)
  private readonly registrationRepository: Repository<RegistrationEntity>;
  @InjectRepository(ProgramEntity)
  private readonly programRepository: Repository<ProgramEntity>;
  @InjectRepository(ValidationDataAttributesEntity)
  private readonly validationDataAttributesRepository: Repository<
    ValidationDataAttributesEntity
  >;
  @InjectRepository(ConnectionEntity)
  private readonly connectionRepository: Repository<ConnectionEntity>;
  @InjectRepository(FspAttributeEntity)
  private readonly fspAttributeRepository: Repository<FspAttributeEntity>;
  @InjectRepository(UserEntity)
  private readonly userRepository: Repository<UserEntity>;

  public constructor(
    @Inject(forwardRef(() => ProgramService))
    private readonly programService: ProgramService,
    private readonly lookupService: LookupService,
  ) {}

  // PA: get attributes based on programId
  public async getAttributes(programId: number): Promise<any[]> {
    let selectedProgram = await this.programService.findOne(programId);
    let attributes = [];
    if (selectedProgram) {
      for (let criterium of selectedProgram.programQuestions) {
        attributes.push(criterium);
      }
    } else {
      const errors = 'Program does not exist or is not published';
      throw new HttpException({ errors }, HttpStatus.UNAUTHORIZED);
    }
    return attributes;
  }

  // PA: post answers to attributes
  public async uploadPrefilledAnswers(
    referenceId: string,
    programId: number,
    prefilledAnswersRaw: PrefilledAnswerDto[],
  ): Promise<any[]> {
    //Then save new information
    const prefilledAnswers = await this.cleanAnswers(
      prefilledAnswersRaw,
      programId,
    );
    let validationDatas = [];
    for (let answer of prefilledAnswers) {
      const oldAttribute = await this.validationDataAttributesRepository.findOne(
        {
          where: {
            referenceId: referenceId,
            programId: programId,
            attribute: answer.attribute,
          },
        },
      );
      if (oldAttribute) {
        oldAttribute.answer = answer.answer;
        const oldValidationData = await this.validationDataAttributesRepository.save(
          oldAttribute,
        );
        validationDatas.push(oldValidationData);
      } else {
        let validationData = new ValidationDataAttributesEntity();
        validationData.referenceId = referenceId;
        validationData.attributeId = answer.attributeId;
        validationData.attribute = answer.attribute;
        validationData.answer = answer.answer;
        let newValidationData;
        validationData.programId = programId;

        newValidationData = await this.validationDataAttributesRepository.save(
          validationData,
        );
        validationDatas.push(newValidationData);
      }
    }

    const registration = await this.registrationRepository.findOne({
      where: { referenceId: referenceId },
    });
    if (
      !registration.customData ||
      Object.keys(registration.customData).length === 0
    ) {
      await this.storePersistentAnswers(
        prefilledAnswers,
        programId,
        referenceId,
      );
    }
    return validationDatas;
  }

  public async cleanAnswers(
    answers: PrefilledAnswerDto[],
    programId: number,
  ): Promise<PrefilledAnswerDto[]> {
    const program = await this.programService.findOne(programId);
    const phonenumberTypedAnswers = [];
    for (let criterium of program.programQuestions) {
      if (criterium.answerType == AnswerTypes.tel) {
        phonenumberTypedAnswers.push(criterium.name);
      }
    }
    const fspTelAttributes = await this.fspAttributeRepository.find({
      where: { answerType: AnswerTypes.tel },
    });
    for (let fspAttr of fspTelAttributes) {
      phonenumberTypedAnswers.push(fspAttr.name);
    }

    const cleanedAnswers = [];
    for (let answer of answers) {
      if (phonenumberTypedAnswers.includes(answer.attribute)) {
        answer.answer = await this.lookupService.lookupAndCorrect(
          answer.answer,
        );
      }
      cleanedAnswers.push(answer);
    }
    return cleanedAnswers;
  }

  public async storePersistentAnswers(
    answersRaw,
    programId,
    referenceId,
  ): Promise<void> {
    const answers = await this.cleanAnswers(answersRaw, programId);
    let program = await this.programRepository.findOne(programId, {
      relations: ['programQuestions'],
    });
    const persistentCriteria = [];
    for (let criterium of program.programQuestions) {
      if (criterium.persistence) {
        persistentCriteria.push(criterium.name);
      }
    }

    let connection = await this.connectionRepository.findOne({
      where: { referenceId: referenceId },
    });

    const customDataToStore = {};
    for (let answer of answers) {
      if (persistentCriteria.includes(answer.attribute)) {
        customDataToStore[answer.attribute] = answer.answer;
      }
      if (answer.attribute === CustomDataAttributes.phoneNumber) {
        connection.phoneNumber = answer.answer;
      }
    }
    connection.customData = JSON.parse(JSON.stringify(customDataToStore));
    await this.connectionRepository.save(connection);
  }

  // public async calculateInclusionScore(
  //   referenceId: string,
  //   programId: number,
  // ): Promise<void> {
  //   const scoreList = await this.createQuestionAnswerListPrefilled(
  //     referenceId,
  //     programId,
  //   );

  //   let program = await this.programRepository.findOne(programId, {
  //     relations: ['programQuestions'],
  //   });
  //   // const score = this.calculateScoreAllCriteria(
  //   //   program.programQuestions,
  //   //   scoreList,
  //   // );
  //   let connection = await this.connectionRepository.findOne({
  //     where: { referenceId: referenceId },
  //   });

  //   // connection.inclusionScore = score;

  //   await this.connectionRepository.save(connection);
  // }

  // private async createQuestionAnswerListPrefilled(
  //   referenceId: string,
  //   programId: number,
  // ): Promise<object> {
  //   const prefilledAnswers = await this.getPrefilledAnswers(
  //     referenceId,
  //     programId,
  //   );
  //   const scoreList = {};
  //   for (let prefilledAnswer of prefilledAnswers) {
  //     let attrValue = prefilledAnswer.answer;
  //     let newKeyName = prefilledAnswer.attribute;
  //     scoreList[newKeyName] = attrValue;
  //   }
  //   return scoreList;
  // }

  // private calculateScoreAllCriteria(
  //   programCriteria: CustomCriterium[],
  //   scoreList: object,
  // ): number {
  //   let totalScore = 0;
  //   for (let criterium of programCriteria) {
  //     let criteriumName = criterium.criterium;
  //     if (scoreList[criteriumName]) {
  //       let answerPA = scoreList[criteriumName];
  //       switch (criterium.answerType) {
  //         case 'dropdown': {
  //           totalScore =
  //             totalScore + this.getScoreForDropDown(criterium, answerPA);
  //         }
  //         case 'numeric':
  //           totalScore =
  //             totalScore + this.getScoreForNumeric(criterium, answerPA);
  //       }
  //     }
  //   }
  //   return totalScore;
  // }

  // private getScoreForDropDown(
  //   criterium: CustomCriterium,
  //   answerPA: object,
  // ): number {
  //   // If questions has no scoring system return 0;
  //   if (Object.keys(criterium.scoring).length === 0) {
  //     return 0;
  //   }
  //   let score = 0;
  //   const options = JSON.parse(JSON.stringify(criterium.options));
  //   for (let value of options) {
  //     if (value.option == answerPA) {
  //       score = criterium.scoring[value.option];
  //     }
  //   }
  //   return score;
  // }

  // private getScoreForNumeric(
  //   criterium: CustomCriterium,
  //   answerPA: number,
  // ): number {
  //   let score = 0;
  //   if (criterium.scoring['multiplier']) {
  //     if (isNaN(answerPA)) {
  //       answerPA = 0;
  //     }
  //     score = criterium.scoring['multiplier'] * answerPA;
  //   }
  //   return score;
  // }
}
