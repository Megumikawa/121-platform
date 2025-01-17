import { ApiModelProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ProgramPhase } from '../../shared/enum/program-phase.model';

export class ChangePhaseDto {
  @ApiModelProperty({
    enum: ProgramPhase,
    example: ProgramPhase.registrationValidation,
  })
  @IsNotEmpty()
  @IsString()
  @IsEnum(ProgramPhase)
  public readonly newPhase: ProgramPhase;
}
