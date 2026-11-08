import { apiRequest } from '../lib/api'
import type { ReservationRecord,ReservationState } from './reservation.types'
export function listMyReservations(status=''){const query=status?`?status=${status}`:'';return apiRequest<{reservations:ReservationRecord[]}>(`/api/reservations/me${query}`)}
export function listReservations(status=''){const query=status?`?status=${status}`:'';return apiRequest<{reservations:ReservationRecord[]}>(`/api/reservations${query}`)}
export function createReservation(bookId:string){return apiRequest<{reservation:ReservationRecord}>('/api/reservations',{method:'POST',body:JSON.stringify({bookId})})}
export function cancelReservation(id:string){return apiRequest<{reservation:ReservationRecord}>(`/api/reservations/${id}`,{method:'DELETE'})}
export function expireReservations(){return apiRequest<{expired:number}>('/api/reservations/expire',{method:'POST'})}
export const reservationStates:ReservationState[]=['pending','ready','fulfilled','cancelled','expired']
