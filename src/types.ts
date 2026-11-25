export interface Claim {
  readmit?: string; // 'Yes' | 'No'
  patientName: string;
  uhid: string;
  mobileNumber?: string;
  insuranceLimit?: string;
  ipdNo?: string;
  doa?: string; // YYYY-MM-DD
  dod?: string; // YYYY-MM-DD
  tpaName?: string;
  insuranceCompany?: string;
  insuranceID?: string;
  claimNo?: string;
  policyNumber?: string;
  empID?: string;
  billInvoiceNo?: string;
  totalBill?: string;
  approved?: string;
  discount?: string;
  deduction?: string; // Payment Received
  patientPay?: string;
  settlementAmount?: string;
  tds?: string;
  paymentDate?: string; // YYYY-MM-DD
  utr?: string;
  attenderName?: string;
  relation?: string;
  insuranceAddress?: string;
  bankName?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  bankAddress?: string;
  courierDetails?: string;
  courierDate?: string; // YYYY-MM-DD
  diagnosis?: string;
  surgeryName?: string;
  remark?: string;
  status?: ClaimStatus;
  [key: string]: any;
}

export type ClaimStatus =
  | 'Admitted'
  | 'Initial Approved'
  | 'Discharge'
  | 'Discharge Approved'
  | 'Pending'
  | 'Settled'
  | 'Denial';

export interface BankDetails {
  bankName?: string;
  bankAccountNo: string;
  ifscCode: string;
  bankAddress: string;
  panCard?: string;
}

export interface InvoiceItem {
  id: string;
  gstRate: number;
  mrp: number;
  qty: number;
  rateExclGst: number;
  amount: number;
  gstAmount: number;
}

export interface ColumnDefinition {
  key: string;
  label: string;
}
