"use server"

import { createClient } from "@/lib/supabase/server"
import {
  bookingFormSchema,
  type BookingFormValues,
} from "@/lib/validations/booking"

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string }

function mapRpcError(message: string): string {
  if (message.includes("SERVICE_NOT_FOUND")) return "Выбранная услуга недоступна."
  if (message.includes("DATE_OUT_OF_DEMO_PERIOD"))
    return "Дата вне демонстрационного периода. Выберите другую дату."
  if (message.includes("TIME_OUT_OF_DEMO_SLOTS"))
    return "Выбранное время недоступно. Выберите другое время."
  return "Не удалось создать заявку. Попробуйте ещё раз."
}

/**
 * Создание заявки (статус 'new').
 * Вся проверка выполняется на сервере: zod + RPC create_booking
 * (услуга активна, дата в демо-периоде, время в демо-слотах).
 */
export async function createBooking(input: BookingFormValues): Promise<CreateBookingResult> {
  const parsed = bookingFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Проверьте поля формы." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_booking", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_brand: parsed.data.brand,
    p_model: parsed.data.model,
    p_year: parsed.data.year ?? null,
    p_license_plate: parsed.data.license_plate || null,
    p_service_id: parsed.data.service_id,
    p_booking_date: parsed.data.booking_date,
    p_booking_time: `${parsed.data.booking_time}:00`,
    p_comment: parsed.data.comment || null,
  })

  if (error || !data) {
    return { ok: false, error: mapRpcError(error?.message ?? "") }
  }

  return { ok: true, bookingId: data as string }
}
