import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { IntersolveResultCode } from './api/enum/intersolve-result-code.enum';

@Entity('intersolve_request')
export class IntersolveRequestEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated: Date;

  @Column({ type: 'bigint' })
  public refPos: number;

  @Column({ nullable: true })
  public EAN: string;

  @Column()
  public value: number;

  @Column({ nullable: true })
  public clientReference: number;

  @Column({ nullable: true })
  public resultCodeIssueCard: IntersolveResultCode;

  @Column({ nullable: true })
  public cardId: string;

  @Column({ nullable: true })
  public PIN: number;

  @Column({ nullable: true })
  public balance: number;

  @Column({ nullable: true })
  public transactionId: number;

  @Column({ default: false })
  public isCancelled: boolean;

  @Column({ default: 0 })
  public cancellationAttempts: number;

  @Column({ nullable: true })
  public cancelByRefPosResultCode: IntersolveResultCode;

  @Column({ nullable: true })
  public cancelResultCode: IntersolveResultCode;

  @Column({ default: false })
  public toCancel: boolean;
}
