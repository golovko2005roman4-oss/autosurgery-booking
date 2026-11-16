"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type AdminActionResult = { ok: true } | { ok: false; error: string }

function mapRpcError(message: string): string {
  if (message.includes("SLOT_TAKEN"))
    return "Это время только что заняли. Выберите другой слот."
  if (message.includes("INVALID_TRANSITION"))
    return "Действие недоступно для текущего статуса заявки."
  if (message.includes("REASON_REQUIRED")) return "Укажите причину отклонения."
  if (message.includes("DATE_OUT_OF_DEMO_PERIOD"))
    return "Дата вне демонстрационного периода."
  if (message.includes("TIME_OUT_OF_DEMO_SLOTS"))
    return "Выбранное время недоступно."
  return "Операция не выполнена. Попробуйте ещё раз."
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, error: "Необходима авторизация." as const }
  }
  return { supabase, error: null }
}

function done(id: string): AdminActionResult {
  revalidatePath("/admin")
  revalidatePath(`/admin/${id}`)
  return { ok: true }
}

export async function confirmBookingAction(id: string): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin()
  if (error) return { ok: false, error }
  const { error: rpcError } = await supabase.rpc("confirm_booking", { p_id: id })
  return rpcError ? { ok: false, error: mapRpcError(rpcError.message) } : done(id)
}

export async function cancelBookingAction(
  id: string,
  reason: string
): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin()
  if (error) return { ok: false, error }
  const { error: rpcError } = await supabase.rpc("cancel_booking", {
    p_id: id,
    p_reason: reason,
  })
  return rpcError ? { ok: false, error: mapRpcError(rpcError.message) } : done(id)
}

export async function completeBookingAction(id: string): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin()
  if (error) return { ok: false, error }
  const { error: rpcError } = await supabase.rpc("complete_booking", { p_id: id })
  return rpcError ? { ok: false, error: mapRpcError(rpcError.message) } : done(id)
}

export async function rescheduleBookingAction(
  id: string,
  newDate: string,
  newTime: string
): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin()
  if (error) return { ok: false, error }
  const { error: rpcError } = await supabase.rpc("reschedule_booking", {
    p_id: id,
    p_new_date: newDate,
    p_new_time: `${newTime}:00`,
  })
  return rpcError ? { ok: false, error: mapRpcError(rpcError.message) } : done(id)
}
