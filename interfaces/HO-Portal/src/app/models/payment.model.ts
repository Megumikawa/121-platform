export class PaymentData {
  id: number;
  paymentDate: Date;
  amount: number;
}

export class Payment extends PaymentData {
  statusOpen?: boolean;
  isExportAvailable?: boolean;
}

export class PopupPayoutDetails {
  programId: number;
  payment: number;
  amount: number;
  referenceId: string;
  currency: string;
}

export class SinglePayoutDetails {
  paNr: string;
  amount: number;
  currency: string;
  multiplier: number;
  programId: number;
  payment: number;
  referenceId: string;
}

export class TotalIncluded {
  public registrations: number;
  public transferAmounts: number;
}
