export class Loan {
  readonly #id: string
  readonly #itemId: string
  readonly #memberId: string
  readonly #borrowedAt: Date
  readonly #dueAt: Date
  #returnedAt: Date | null = null

  constructor(id: string, itemId: string, memberId: string, borrowedAt: Date, loanDays: number) {
    this.#id = id
    this.#itemId = itemId
    this.#memberId = memberId
    this.#borrowedAt = new Date(borrowedAt)
    this.#dueAt = new Date(borrowedAt.getTime() + loanDays * 86_400_000)
  }
  get id(): string { return this.#id }
  get itemId(): string { return this.#itemId }
  get memberId(): string { return this.#memberId }
  get borrowedAt(): Date { return new Date(this.#borrowedAt) }
  get dueAt(): Date { return new Date(this.#dueAt) }
  get returnedAt(): Date | null { return this.#returnedAt ? new Date(this.#returnedAt) : null }
  get isActive(): boolean { return this.#returnedAt === null }
  markReturned(at: Date): void {
    if (!this.isActive) throw new Error('Loan is already closed')
    if (at < this.#borrowedAt) throw new Error('Return date cannot precede borrowing date')
    this.#returnedAt = new Date(at)
  }
}
