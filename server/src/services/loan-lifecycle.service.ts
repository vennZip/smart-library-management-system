import type { AuthenticatedUser } from '../auth/auth.types.js'
import { StandardOverdueFinePolicy } from '../domain/fine-policy.js'
import { LoanIncident } from '../domain/loan-incident.js'
import { StandardRenewalPolicy, type RenewalPolicy } from '../domain/renewal-policy.js'
import type { LoanLifecycleRepository } from '../repositories/loan-lifecycle.repository.js'

export class LoanLifecycleValidationError extends Error {}
export class LoanLifecycleConflictError extends Error {}
export class LoanLifecycleForbiddenError extends Error {}

function identifier(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) throw new LoanLifecycleValidationError('A loan ID is required')
  return value.trim()
}

export class LoanLifecycleService {
  constructor(private readonly repository: LoanLifecycleRepository, private readonly renewalPolicy: RenewalPolicy = new StandardRenewalPolicy(), private readonly clock: () => Date = () => new Date()) {}

  async renew(rawId: unknown, actor: AuthenticatedUser) {
    const id = identifier(rawId)
    const context = await this.repository.renewalContext(id)
    if (!context) return null
    if (actor.role === 'student' && actor.id !== context.memberId) throw new LoanLifecycleForbiddenError('You can only renew your own loans')
    try {
      this.renewalPolicy.nextDueDate(context, this.clock())
      return await this.repository.renew(id, context.dueAt)
    } catch (error) { throw new LoanLifecycleConflictError(error instanceof Error ? error.message : 'Renewal failed') }
  }

  async resolve(rawId: unknown, raw: unknown, actor: AuthenticatedUser) {
    if (actor.role !== 'admin' && actor.role !== 'librarian') throw new LoanLifecycleForbiddenError('Only staff can resolve lost or damaged books')
    const id = identifier(rawId)
    let incident: LoanIncident
    try {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Incident details are required')
      incident = new LoanIncident(raw as Record<string, unknown>)
    } catch (error) { throw new LoanLifecycleValidationError(error instanceof Error ? error.message : 'Invalid incident') }
    const context = await this.repository.resolutionContext(id)
    if (!context) return null
    const at = this.clock()
    const fine = new StandardOverdueFinePolicy(context.policy.dailyRateCents, context.policy.maximumFineCents).calculate(new Date(context.dueAt), at)
    try { return await this.repository.resolve(id, incident.toInput(), at.toISOString(), fine.amountCents) }
    catch (error) { throw new LoanLifecycleConflictError(error instanceof Error ? error.message : 'Incident resolution failed') }
  }
}
