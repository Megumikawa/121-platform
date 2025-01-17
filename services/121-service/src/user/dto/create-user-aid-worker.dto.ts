import { IsNotEmpty, MinLength, IsEmail, IsArray } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';
import { UserRole } from '../../user-role.enum';

export class CreateUserAidWorkerDto {
  @ApiModelProperty({ example: 'admin@example.org' })
  @IsNotEmpty()
  @IsEmail()
  public readonly email: string;

  @ApiModelProperty({ example: 'password' })
  @IsNotEmpty()
  @MinLength(8)
  public readonly password: string;

  @ApiModelProperty({
    example: Object.values(UserRole),
    enum: UserRole,
  })
  @IsArray()
  public readonly roles: UserRole[];
}
