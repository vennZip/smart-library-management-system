import type { BorrowingPolicy } from '../domain/borrowing-policy.js'
import type { LibraryItem } from '../domain/library-item.js'
import { Loan } from '../domain/loan.js'
import type { Member } from '../domain/member.js'

export class BorrowingService {
  readonly #policy: BorrowingPolicy
  constructor(policy: BorrowingPolicy) { this.#policy = policy }
  borrow(loanId: string, item: LibraryItem, member: Member, borrowedAt = new Date()): Loan {
    this.#policy.assertCanBorrow(item, member)
    const loanDays = this.#policy.loanDaysFor(item, member)
    item.checkout()
    member.registerLoan()
    return new Loan(loanId, item.id, member.id, borrowedAt, loanDays)
  }
  returnItem(loan: Loan, item: LibraryItem, member: Member, returnedAt = new Date()): void {
    loan.markReturned(returnedAt)
    item.returnCopy()
    member.registerReturn()
  }
}
