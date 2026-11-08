import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReservationRecord,ReservationState } from '../reservations/reservation.types.js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'

export interface ReservationRepository {
  list(status?:ReservationState):Promise<ReservationRecord[]>
  create(bookId:string):Promise<ReservationRecord>
  cancel(id:string):Promise<ReservationRecord|null>
  expireReady():Promise<number>
}

type ReservationRow={id:string;book_id:string;member_id:string;status:ReservationState;created_at:string;ready_until:string|null;fulfilled_at:string|null;assigned_copy_id:string|null;books:{title:string;author:string};profiles:{display_name:string;email:string};book_copies:{barcode:string;shelf_location:string}|null}
const reservationSelect='id,book_id,member_id,status,created_at,ready_until,fulfilled_at,assigned_copy_id,books(title,author),profiles!reservations_member_id_fkey(display_name,email),book_copies!reservations_assigned_copy_id_fkey(barcode,shelf_location)'

export class SupabaseReservationRepository implements ReservationRepository {
  readonly #client:SupabaseClient
  constructor(client:SupabaseClient){this.#client=client}
  async list(status?:ReservationState){let request=this.#client.from('reservations').select(reservationSelect).order('created_at',{ascending:true}).limit(100);if(status)request=request.eq('status',status);const{data,error}=await request;if(error)throw new Error(`Reservation query failed: ${error.message}`);return Promise.all((data as unknown as ReservationRow[]).map(row=>this.map(row)))}
  async create(bookId:string){const{data,error}=await this.#client.rpc('create_reservation',{p_book_id:bookId});if(error)throw new Error(error.message);return this.get(data.id as string)}
  async cancel(id:string){const{data,error}=await this.#client.rpc('cancel_reservation',{p_reservation_id:id});if(error){if(error.code==='P0002')return null;throw new Error(error.message)}return this.get(data.id as string)}
  async expireReady(){const{data,error}=await this.#client.rpc('expire_ready_reservations');if(error)throw new Error(error.message);return typeof data==='number'?data:0}
  private async get(id:string){const{data,error}=await this.#client.from('reservations').select(reservationSelect).eq('id',id).single();if(error)throw new Error(`Reservation lookup failed: ${error.message}`);return this.map(data as unknown as ReservationRow)}
  private async map(row:ReservationRow):Promise<ReservationRecord>{let queuePosition:number|null=null;if(row.status==='pending'||row.status==='ready'){const{data,error}=await this.#client.rpc('reservation_queue_position',{p_reservation_id:row.id});if(error)throw new Error(`Queue position failed: ${error.message}`);queuePosition=typeof data==='number'?data:null}return{id:row.id,bookId:row.book_id,bookTitle:row.books.title,bookAuthor:row.books.author,memberId:row.member_id,memberName:row.profiles.display_name,memberEmail:row.profiles.email,status:row.status,createdAt:row.created_at,readyUntil:row.ready_until,fulfilledAt:row.fulfilled_at,assignedCopyId:row.assigned_copy_id,assignedBarcode:row.book_copies?.barcode??null,shelfLocation:row.book_copies?.shelf_location??null,queuePosition}}
}

export function createReservationRepository(token:string){return new SupabaseReservationRepository(createSupabaseUserClient(token))}
