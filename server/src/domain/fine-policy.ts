export interface FinePolicy {
  calculate(dueAt:Date,returnedAt:Date):FineAssessment
}

export interface FineAssessment {overdueDays:number;amountCents:number}

export class StandardOverdueFinePolicy implements FinePolicy {
  readonly #dailyRateCents:number
  readonly #maximumFineCents:number
  constructor(dailyRateCents:number,maximumFineCents:number){
    if(!Number.isInteger(dailyRateCents)||dailyRateCents<=0)throw new Error('Daily fine rate must be a positive integer')
    if(!Number.isInteger(maximumFineCents)||maximumFineCents<dailyRateCents)throw new Error('Maximum fine must cover at least one day')
    this.#dailyRateCents=dailyRateCents;this.#maximumFineCents=maximumFineCents
  }
  calculate(dueAt:Date,returnedAt:Date):FineAssessment{
    const difference=returnedAt.getTime()-dueAt.getTime()
    const overdueDays=Math.max(0,Math.ceil(difference/86_400_000))
    return{overdueDays,amountCents:Math.min(this.#maximumFineCents,overdueDays*this.#dailyRateCents)}
  }
}
