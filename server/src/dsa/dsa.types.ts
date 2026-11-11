export interface DsaLoanSource {id:string;memberName:string;bookTitle:string;barcode:string;borrowedAt:string;returnedAt:string|null;status:'active'|'returned'}
export interface DsaReservationSource {id:string;bookId:string;bookTitle:string;memberName:string;createdAt:string}
export interface DsaCatalogSource {id:string;title:string;isbn:string;updatedAt:string}
export interface DsaSnapshot {loans:DsaLoanSource[];reservations:DsaReservationSource[];catalog:DsaCatalogSource[];barcodes:string[]}
export interface Complexity {operation:string;time:string;space:string}
export interface DsaOverview {
  generatedAt:string
  persistenceNote:string
  linkedList:{feature:string;rationale:string;size:number;headId:string|null;tailId:string|null;nodes:Array<DsaLoanSource&{nextId:string|null}>;complexity:Complexity[]}
  queue:{feature:string;rationale:string;totalWaiting:number;groups:Array<{bookId:string;bookTitle:string;nextMember:string|null;members:Array<{reservationId:string;memberName:string;position:number;createdAt:string}>}>;complexity:Complexity[]}
  stack:{feature:string;rationale:string;size:number;topId:string|null;items:Array<DsaCatalogSource&{depth:number}>;complexity:Complexity[]}
  hashSet:{feature:string;rationale:string;isbn:{unique:number;duplicates:string[];statistics:{bucketCount:number;usedBuckets:number;collisions:number;loadFactor:number}};barcodes:{unique:number;duplicates:string[];statistics:{bucketCount:number;usedBuckets:number;collisions:number;loadFactor:number}};complexity:Complexity[]}
}
export interface IdentifierValidation {valid:boolean;isbn:{accepted:number;duplicates:string[]};barcodes:{accepted:number;duplicates:string[]};statistics:{isbnLoadFactor:number;barcodeLoadFactor:number}}
