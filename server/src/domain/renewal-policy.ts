export interface RenewalContext {
  memberId: string
  status: 'active' | 'returned' | 'lost'
  dueAt: string
  renewalCount: number
  memberStatus: 'active' | 'suspended'
  outstandingCents: number
  borrowingBlockCents: number
  hasWaitlist: boolean
  copyStatus: string
}

export interface RenewalPolicy {
  nextDueDate(context: RenewalContext, now: Date): Date
}

export class StandardRenewalPolicy implements RenewalPolicy {
  nextDueDate(context: RenewalContext, now: Date): Date {
    const due = new Date(context.dueAt)
    if (!Number.isFinite(due.getTime()) || !Number.isFinite(now.getTime())) throw new Error('Invalid renewal date')
    if (context.status !== 'active' || context.copyStatus !== 'on_loan') throw new Error('Only an active on-loan copy can be renewed')
    if (due <= now) throw new Error('Renew before the due date; overdue loans cannot be renewed')
    if (context.renewalCount >= 1) throw new Error('This loan has already used its one renewal')
    if (context.memberStatus !== 'active') throw new Error('Suspended members cannot renew loans')
    if (context.outstandingCents >= context.borrowingBlockCents) throw new Error('Reduce the outstanding fine balance before renewing')
    if (context.hasWaitlist) throw new Error('This title has a waitlist and cannot be renewed')
    return new Date(due.getTime() + 7 * 86_400_000)
  }
}
