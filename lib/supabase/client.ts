import { createBrowserClient } from "@supabase/ssr"

// ВАЖНО: обращение к process.env только литеральным именем — Next/webpack
// подставляет NEXT_PUBLIC_* значения в клиентский бандл на этапе сборки.
// Динамический доступ process.env[name] с переменной в браузере даёт undefined.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Браузерный Supabase-клиент (anon key — безопасен для клиента). */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL / " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY. Скопируйте .env.example в .env.local"
    )
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
