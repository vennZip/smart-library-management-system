export const copyStatuses=['available','on_loan','reserved','lost','maintenance'] as const
export type CopyStatus=(typeof copyStatuses)[number]
export interface BookCopyRecord { id:string;bookId:string;barcode:string;shelfLocation:string;status:CopyStatus;acquiredAt:string|null;createdAt:string }
export interface BookCopyInput { barcode:string;shelfLocation:string;status?:CopyStatus;acquiredAt?:string|null }
