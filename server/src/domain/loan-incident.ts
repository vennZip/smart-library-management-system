export type IncidentKind = 'lost' | 'damaged'
export interface IncidentInput { kind: IncidentKind; reason: string; chargeCents: number }

export class LoanIncident {
  readonly #kind: IncidentKind
  readonly #reason: string
  readonly #chargeCents: number

  constructor(raw: Record<string, unknown>) {
    if (raw.kind !== 'lost' && raw.kind !== 'damaged') throw new Error('Incident must be lost or damaged')
    if (typeof raw.reason !== 'string' || raw.reason.trim().length < 2 || raw.reason.trim().length > 240) throw new Error('Reason must contain 2 to 240 characters')
    if (typeof raw.chargeCents !== 'number' || !Number.isSafeInteger(raw.chargeCents) || raw.chargeCents < 0 || raw.chargeCents > 10_000_000) throw new Error('Charge must be between 0 and 10000000 whole centavos')
    this.#kind = raw.kind
    this.#reason = raw.reason.trim()
    this.#chargeCents = raw.chargeCents
  }

  toInput(): IncidentInput { return { kind: this.#kind, reason: this.#reason, chargeCents: this.#chargeCents } }
}
