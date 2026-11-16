export type BookingStatus = "new" | "confirmed" | "cancelled" | "completed"

export const BOOKING_STATUSES: BookingStatus[] = [
  "new",
  "confirmed",
  "cancelled",
  "completed",
]

export interface Service {
  id: string
  title: string
  price_from: number | null
}

/** Заявка с JOIN-полями (как приходит из Supabase с вложенными таблицами). */
export interface BookingWithRelations {
  id: string
  booking_date: string
  booking_time: string
  status: BookingStatus
  comment: string | null
  cancel_reason: string | null
  created_at: string
  clients: { name: string; phone: string } | null
  vehicles: {
    brand: string
    model: string
    year: number | null
    license_plate: string | null
  } | null
  services: { title: string } | null
}

/** Публичная сводка заявки (get_booking_public) для экрана подтверждения. */
export interface PublicBooking {
  id: string
  status: BookingStatus
  booking_date: string
  booking_time: string
  service_title: string
  brand: string
  model: string
}
