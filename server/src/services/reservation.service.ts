import type { ReservationState } from '../reservations/reservation.types.js'
import type { ReservationRepository } from '../repositories/reservation.repository.js'

export class ReservationValidationError extends Error{}
export class ReservationConflictError extends Error{}
const states:ReservationState[]=['pending','ready','fulfilled','cancelled','expired']
function requiredId(value:unknown,field:string){if(typeof value!=='string'||!value.trim())throw new ReservationValidationError(`${field} is required`);return value.trim()}

export class ReservationService {
  readonly #repository:ReservationRepository
  constructor(repository:ReservationRepository){this.#repository=repository}
  list(rawStatus:unknown){const status=typeof rawStatus==='string'&&states.includes(rawStatus as ReservationState)?rawStatus as ReservationState:undefined;return this.#repository.list(status)}
  async reserve(raw:Record<string,unknown>){const bookId=requiredId(raw.bookId,'Book');try{return await this.#repository.create(bookId)}catch(error){throw new ReservationConflictError(error instanceof Error?error.message:'Reservation could not be created')}}
  async cancel(rawId:unknown){const id=requiredId(rawId,'Reservation');try{return await this.#repository.cancel(id)}catch(error){throw new ReservationConflictError(error instanceof Error?error.message:'Reservation could not be cancelled')}}
  async expire(){try{return await this.#repository.expireReady()}catch(error){throw new ReservationConflictError(error instanceof Error?error.message:'Expired reservations could not be processed')}}
}
