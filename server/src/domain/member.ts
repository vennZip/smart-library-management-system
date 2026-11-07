export type MemberStatus = 'active' | 'suspended'

export class Member {
  readonly #id: string
  readonly #name: string
  #status: MemberStatus = 'active'
  #activeLoanCount = 0

  constructor(id: string, name: string) {
    if (!id.trim() || !name.trim()) throw new Error('A member requires an id and name')
    this.#id = id
    this.#name = name
  }

  get id(): string { return this.#id }
  get name(): string { return this.#name }
  get status(): MemberStatus { return this.#status }
  get activeLoanCount(): number { return this.#activeLoanCount }
  suspend(): void { this.#status = 'suspended' }
  reactivate(): void { this.#status = 'active' }
  registerLoan(): void { this.#activeLoanCount += 1 }
  registerReturn(): void {
    if (this.#activeLoanCount === 0) throw new Error('Member has no active loans')
    this.#activeLoanCount -= 1
  }
}
