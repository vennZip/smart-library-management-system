import type { LibraryItem } from './library-item.js'
import type { Member } from './member.js'

export interface BorrowingPolicy {
  loanDaysFor(item: LibraryItem, member: Member): number
  assertCanBorrow(item: LibraryItem, member: Member): void
}

export class StudentBorrowingPolicy implements BorrowingPolicy {
  loanDaysFor(item: LibraryItem): number { return item.standardLoanDays() }
  assertCanBorrow(item: LibraryItem, member: Member): void {
    if (member.status !== 'active') throw new Error('Suspended members cannot borrow items')
    if (member.activeLoanCount >= 5) throw new Error('Student loan limit reached')
    if (!item.isAvailable) throw new Error('Item is not available for borrowing')
  }
}

export class StaffBorrowingPolicy implements BorrowingPolicy {
  loanDaysFor(item: LibraryItem): number { return item.standardLoanDays() * 2 }
  assertCanBorrow(item: LibraryItem, member: Member): void {
    if (member.status !== 'active') throw new Error('Suspended members cannot borrow items')
    if (member.activeLoanCount >= 10) throw new Error('Staff loan limit reached')
    if (!item.isAvailable) throw new Error('Item is not available for borrowing')
  }
}
