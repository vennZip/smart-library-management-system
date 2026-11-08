export type FineStatus='open'|'settled'
export type FineTransactionType='payment'|'adjustment'
export interface FineTransactionRecord {id:string;type:FineTransactionType;amountCents:number;note:string;recordedBy:string;recordedByName:string;createdAt:string}
export interface FineRecord {id:string;loanId:string;memberId:string;memberName:string;memberEmail:string;bookTitle:string;barcode:string;overdueDays:number;originalAmountCents:number;balanceCents:number;status:FineStatus;assessedAt:string;transactions:FineTransactionRecord[]}
export interface FineSummary {outstandingCents:number;assessedCents:number;paidOrCreditedCents:number;borrowingBlockCents:number;borrowingBlocked:boolean}
export interface FineLedger {fines:FineRecord[];summary:FineSummary}
