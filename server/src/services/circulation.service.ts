import { StudentBorrowingPolicy } from '../domain/borrowing-policy.js'
import { Book } from '../domain/library-item.js'
import { Member } from '../domain/member.js'
import { BorrowingService } from './borrowing.service.js'
import type { CirculationRepository } from '../repositories/circulation.repository.js'

export class CirculationValidationError extends Error{}
export class CirculationConflictError extends Error{}
function id(value:unknown,field:string){if(typeof value!=='string'||!value.trim())throw new CirculationValidationError(`${field} is required`);return value.trim()}

export class CirculationService{
  readonly #repository:CirculationRepository
  constructor(repository:CirculationRepository){this.#repository=repository}
  list(rawStatus:unknown){const status=rawStatus==='active'||rawStatus==='returned'?rawStatus:undefined;return this.#repository.listLoans(status)}
  searchMembers(raw:unknown){const search=typeof raw==='string'?raw.trim().slice(0,100):'';return this.#repository.searchMembers(search)}
  searchCopies(raw:unknown){const search=typeof raw==='string'?raw.trim().slice(0,80):'';return this.#repository.searchAvailableCopies(search)}
  async checkout(raw:Record<string,unknown>){const memberId=id(raw.memberId,'Member');const copyId=id(raw.copyId,'Copy');const context=await this.#repository.getCheckoutContext(memberId,copyId);if(!context)throw new CirculationConflictError('The selected member or available copy no longer exists');const member=new Member(context.member.id,context.member.displayName);if(context.member.status==='suspended')member.suspend();for(let count=0;count<context.member.activeLoanCount;count+=1)member.registerLoan();const item=new Book(context.copy.bookId,context.copy.bookTitle,1,context.copy.isbn);let planned;try{planned=new BorrowingService(new StudentBorrowingPolicy()).borrow('pending',item,member)}catch(error){throw new CirculationConflictError(error instanceof Error?error.message:'Borrowing policy rejected the checkout')}try{return await this.#repository.issueLoan(copyId,memberId,planned.dueAt.toISOString())}catch(error){throw new CirculationConflictError(error instanceof Error?error.message:'Checkout could not be completed')}}
  async returnLoan(rawId:unknown){const loanId=id(rawId,'Loan');try{return await this.#repository.returnLoan(loanId)}catch(error){throw new CirculationConflictError(error instanceof Error?error.message:'Return could not be completed')}}
}
