import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FineLedger,FineRecord } from '../fines/fine.types.js'
import type { FineRepository } from '../repositories/fine.repository.js'
import { FineService,FineValidationError } from './fine.service.js'
const fine:FineRecord={id:'fine-1',loanId:'loan-1',memberId:'member-1',memberName:'Alex',memberEmail:'alex@example.edu',bookTitle:'Algorithms',barcode:'LIB-1',overdueDays:2,originalAmountCents:2000,balanceCents:2000,status:'open',assessedAt:'2026-11-08T00:00:00Z',transactions:[]}
const ledger:FineLedger={fines:[fine],summary:{outstandingCents:2000,assessedCents:2000,paidOrCreditedCents:0,borrowingBlockCents:50000,borrowingBlocked:false}}
class MemoryFineRepository implements FineRepository{payment=0;adjustment=0;async list(){return ledger}async recordPayment(_id:string,amount:number){this.payment=amount;return{...fine,balanceCents:fine.balanceCents-amount}}async recordAdjustment(_id:string,amount:number){this.adjustment=amount;return{...fine,balanceCents:fine.balanceCents+amount}}}
test('fine service records validated payments',async()=>{const repository=new MemoryFineRepository();await new FineService(repository).payment('fine-1',{amountCents:1000,note:'Cash receipt'});assert.equal(repository.payment,1000)})
test('fine service permits signed staff adjustments',async()=>{const repository=new MemoryFineRepository();await new FineService(repository).adjustment('fine-1',{amountCents:-500,note:'Courtesy reduction'});assert.equal(repository.adjustment,-500)})
test('fine service rejects fractional minor-unit amounts',async()=>{await assert.rejects(()=>new FineService(new MemoryFineRepository()).payment('fine-1',{amountCents:10.5,note:'Cash'}),FineValidationError)})
test('fine service requires an audit note',async()=>{await assert.rejects(()=>new FineService(new MemoryFineRepository()).adjustment('fine-1',{amountCents:-500,note:''}),FineValidationError)})
