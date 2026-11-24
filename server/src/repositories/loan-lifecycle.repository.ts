import type { SupabaseClient } from '@supabase/supabase-js'
import type { FinePolicyConfig, LoanRecord } from '../circulation/circulation.types.js'
import type { IncidentInput } from '../domain/loan-incident.js'
import type { RenewalContext } from '../domain/renewal-policy.js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'
import { SupabaseCirculationRepository } from './circulation.repository.js'

export interface LoanLifecycleRepository {
  renewalContext(id: string): Promise<RenewalContext | null>
  renew(id: string, expectedDueAt: string): Promise<LoanRecord>
  resolutionContext(id: string): Promise<{ dueAt: string; policy: FinePolicyConfig } | null>
  resolve(id: string, input: IncidentInput, resolvedAt: string, overdueFineCents: number): Promise<LoanRecord | null>
}

export class SupabaseLoanLifecycleRepository implements LoanLifecycleRepository {
  readonly #client: SupabaseClient
  readonly #circulation: SupabaseCirculationRepository
  constructor(client: SupabaseClient) { this.#client = client; this.#circulation = new SupabaseCirculationRepository(client) }

  async renewalContext(id: string): Promise<RenewalContext | null> {
    const { data, error } = await this.#client.rpc('loan_renewal_context', { p_loan_id: id })
    if (error) throw new Error(error.message)
    return data as RenewalContext | null
  }
  async renew(id: string, expectedDueAt: string) {
    const { data, error } = await this.#client.rpc('renew_loan', { p_loan_id: id, p_expected_due_at: expectedDueAt })
    if (error) throw new Error(error.message)
    return this.#circulation.getLoan(data.id as string)
  }
  async resolutionContext(id: string) {
    const context = await this.#circulation.getReturnContext(id)
    return context ? { dueAt: context.dueAt, policy: await this.#circulation.getFinePolicy() } : null
  }
  async resolve(id: string, input: IncidentInput, resolvedAt: string, overdueFineCents: number) {
    const { data, error } = await this.#client.rpc('resolve_loan_incident', { p_loan_id: id, p_kind: input.kind, p_reason: input.reason, p_charge_cents: input.chargeCents, p_resolved_at: resolvedAt, p_overdue_fine_cents: overdueFineCents })
    if (error) { if (error.code === 'P0002') return null; throw new Error(error.message) }
    return this.#circulation.getLoan(data.id as string)
  }
}
export function createLoanLifecycleRepository(token: string) { return new SupabaseLoanLifecycleRepository(createSupabaseUserClient(token)) }
