"use server"

import { createClient } from "@/lib/supabase/server"

export type LoginResult = { ok: true } | { ok: false; error: string }

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  if (!email || !password) {
    return { ok: false, error: "Введите e-mail и пароль." }
  }

  let supabase
  try {
    supabase = await createClient()
  } catch {
    return {
      ok: false,
      error: "Supabase не настроен. Проверьте .env.local (см. README).",
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: "Неверный e-mail или пароль." }
  }
  return { ok: true }
}
