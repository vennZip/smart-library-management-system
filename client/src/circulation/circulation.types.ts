export type LoanState='active'|'returned'|'lost'
export interface LoanRecord {id:string;copyId:string;memberId:string;memberName:string;memberEmail:string;barcode:string;bookId:string;bookTitle:string;bookAuthor:string;borrowedAt:string;dueAt:string;returnedAt:string|null;status:LoanState;overdue:boolean;renewalCount:number;renewedAt:string|null;closedAt:string|null;incident:LoanIncidentRecord|null}
export interface MemberSummary {id:string;displayName:string;email:string;status:'active'|'suspended';activeLoanCount:number}
export interface AvailableCopy {id:string;barcode:string;shelfLocation:string;bookId:string;bookTitle:string;bookAuthor:string;isbn:string}

export interface LoanIncidentRecord {kind:'lost'|'damaged';reason:string;chargeCents:number;createdAt:string}
