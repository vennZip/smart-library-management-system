import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ReservationRecord } from '../reservations/reservation.types.js'
import type { ReservationRepository } from '../repositories/reservation.repository.js'
import { ReservationConflictError,ReservationService,ReservationValidationError } from './reservation.service.js'

const reservation:ReservationRecord={id:'reservation-1',bookId:'book-1',bookTitle:'Clean Code',bookAuthor:'Robert Martin',memberId:'member-1',memberName:'Alex Student',memberEmail:'alex@example.edu',status:'pending',createdAt:'2026-11-08T00:00:00Z',readyUntil:null,fulfilledAt:null,assignedCopyId:null,assignedBarcode:null,shelfLocation:null,queuePosition:1}
class MemoryReservationRepository implements ReservationRepository {createdBook='';cancelled='';expired=0;fail=false;async list(){return[reservation]}async create(bookId:string){if(this.fail)throw new Error('No available-copy reservations');this.createdBook=bookId;return reservation}async cancel(id:string){this.cancelled=id;return id===reservation.id?{...reservation,status:'cancelled' as const}:null}async expireReady(){this.expired=2;return this.expired}}

test('reservation service validates and creates a waitlist request',async()=>{const repository=new MemoryReservationRepository();await new ReservationService(repository).reserve({bookId:' book-1 '});assert.equal(repository.createdBook,'book-1')})
test('reservation service rejects a missing book identifier',async()=>{const service=new ReservationService(new MemoryReservationRepository());await assert.rejects(()=>service.reserve({}),ReservationValidationError)})
test('reservation service translates repository conflicts',async()=>{const repository=new MemoryReservationRepository();repository.fail=true;await assert.rejects(()=>new ReservationService(repository).reserve({bookId:'book-1'}),ReservationConflictError)})
test('reservation cancellation delegates to the atomic repository operation',async()=>{const repository=new MemoryReservationRepository();const result=await new ReservationService(repository).cancel('reservation-1');assert.equal(repository.cancelled,'reservation-1');assert.equal(result?.status,'cancelled')})
test('staff expiry processing reports the number reassigned',async()=>{const repository=new MemoryReservationRepository();assert.equal(await new ReservationService(repository).expire(),2)})
