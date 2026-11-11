export interface Complexity {operation:string;time:string;space:string}
export interface DsaOverview {
  generatedAt:string;persistenceNote:string
  linkedList:{feature:string;rationale:string;size:number;headId:string|null;tailId:string|null;nodes:Array<{id:string;memberName:string;bookTitle:string;barcode:string;borrowedAt:string;returnedAt:string|null;status:'active'|'returned';nextId:string|null}>;complexity:Complexity[]}
  queue:{feature:string;rationale:string;totalWaiting:number;groups:Array<{bookId:string;bookTitle:string;nextMember:string|null;members:Array<{reservationId:string;memberName:string;position:number;createdAt:string}>}>;complexity:Complexity[]}
  stack:{feature:string;rationale:string;size:number;topId:string|null;items:Array<{id:string;title:string;isbn:string;updatedAt:string;depth:number}>;complexity:Complexity[]}
  hashSet:{feature:string;rationale:string;isbn:HashAudit;barcodes:HashAudit;complexity:Complexity[]}
}
export interface HashAudit {unique:number;duplicates:string[];statistics:{bucketCount:number;usedBuckets:number;collisions:number;loadFactor:number}}
export interface IdentifierValidation {valid:boolean;isbn:{accepted:number;duplicates:string[]};barcodes:{accepted:number;duplicates:string[]};statistics:{isbnLoadFactor:number;barcodeLoadFactor:number}}
