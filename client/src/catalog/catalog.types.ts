export interface BookRecord { id:string;isbn:string;title:string;author:string;publisher:string|null;publicationYear:number|null;category:string;description:string|null;coverUrl:string|null;archivedAt:string|null;totalCopies:number;availableCopies:number }
export interface BookInput { isbn:string;title:string;author:string;publisher:string;publicationYear:string;category:string;description:string;coverUrl:string }
export interface CatalogPage { items:BookRecord[];page:number;pageSize:number;total:number;totalPages:number }
export const copyStatuses=['available','on_loan','reserved','lost','maintenance'] as const
export type CopyStatus=(typeof copyStatuses)[number]
export interface BookCopyRecord { id:string;bookId:string;barcode:string;shelfLocation:string;status:CopyStatus;acquiredAt:string|null;createdAt:string }
export interface BookCopyInput { barcode:string;shelfLocation:string;status:CopyStatus;acquiredAt:string }
