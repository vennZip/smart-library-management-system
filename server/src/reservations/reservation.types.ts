export type ReservationState='pending'|'ready'|'fulfilled'|'cancelled'|'expired'

export interface ReservationRecord {
  id:string
  bookId:string
  bookTitle:string
  bookAuthor:string
  memberId:string
  memberName:string
  memberEmail:string
  status:ReservationState
  createdAt:string
  readyUntil:string|null
  fulfilledAt:string|null
  assignedCopyId:string|null
  assignedBarcode:string|null
  shelfLocation:string|null
  queuePosition:number|null
}
