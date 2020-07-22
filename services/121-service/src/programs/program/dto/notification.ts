import { ApiModelProperty } from '@nestjs/swagger';

import { IsNumber } from 'class-validator';

export enum NotificationType {
  include = 'include',
  reject = 'reject',
}

export class NotificationDto {
  @ApiModelProperty({ example: 1 })
  @IsNumber()
  public readonly programId: number;
  @ApiModelProperty({ example: 'include' })
  public readonly notificationType: NotificationType;
}
