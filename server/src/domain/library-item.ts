export type LibraryItemSnapshot = {
  id: string
  title: string
  availableCopies: number
  totalCopies: number
  itemType: string
}

export abstract class LibraryItem {
  readonly #id: string
  readonly #title: string
  readonly #totalCopies: number
  #availableCopies: number

  protected constructor(id: string, title: string, totalCopies: number) {
    if (!id.trim() || !title.trim()) throw new Error('An item requires an id and title')
    if (!Number.isInteger(totalCopies) || totalCopies < 1) throw new Error('Total copies must be a positive integer')
    this.#id = id
    this.#title = title
    this.#totalCopies = totalCopies
    this.#availableCopies = totalCopies
  }

  get id(): string { return this.#id }
  get title(): string { return this.#title }
  get availableCopies(): number { return this.#availableCopies }
  get isAvailable(): boolean { return this.#availableCopies > 0 && this.canCirculate() }

  checkout(): void {
    if (!this.canCirculate()) throw new Error(`${this.itemType} items cannot leave the library`)
    if (this.#availableCopies === 0) throw new Error('No copies are currently available')
    this.#availableCopies -= 1
  }

  returnCopy(): void {
    if (this.#availableCopies >= this.#totalCopies) throw new Error('All copies are already accounted for')
    this.#availableCopies += 1
  }

  toSnapshot(): LibraryItemSnapshot {
    return { id: this.#id, title: this.#title, availableCopies: this.#availableCopies, totalCopies: this.#totalCopies, itemType: this.itemType }
  }

  abstract get itemType(): string
  abstract canCirculate(): boolean
  abstract standardLoanDays(): number
}

export class Book extends LibraryItem {
  readonly #isbn: string
  constructor(id: string, title: string, totalCopies: number, isbn: string) {
    super(id, title, totalCopies)
    if (!isbn.trim()) throw new Error('A book requires an ISBN')
    this.#isbn = isbn
  }
  get isbn(): string { return this.#isbn }
  get itemType(): string { return 'Book' }
  canCirculate(): boolean { return true }
  standardLoanDays(): number { return 14 }
}

export class ReferenceBook extends LibraryItem {
  constructor(id: string, title: string, totalCopies: number) { super(id, title, totalCopies) }
  get itemType(): string { return 'Reference book' }
  canCirculate(): boolean { return false }
  standardLoanDays(): number { return 0 }
}
