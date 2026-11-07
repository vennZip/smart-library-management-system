export class Reservation {
  readonly #id: string
  readonly #itemId: string
  readonly #memberId: string
  readonly #createdAt: Date
  #active = true
  constructor(id: string, itemId: string, memberId: string, createdAt = new Date()) {
    this.#id=id; this.#itemId=itemId; this.#memberId=memberId; this.#createdAt=new Date(createdAt)
  }
  get id(): string { return this.#id }
  get itemId(): string { return this.#itemId }
  get memberId(): string { return this.#memberId }
  get createdAt(): Date { return new Date(this.#createdAt) }
  get isActive(): boolean { return this.#active }
  cancel(): void { this.#active=false }
}
