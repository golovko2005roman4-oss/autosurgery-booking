import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Литеральные обращения к process.env (см. lib/supabase/client.ts):
// динамический доступ с переменной не попадает в клиентский бандл.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Серверный Supabase-клиент (используется в server components и actions). */
export async function createClient() {
  const cookieStore = await cookies()

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL / " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY. Скопируйте .env.example в .env.local"
    )
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Вызов из Server Component — куки обновит middleware на следующем запросе.
          }
        },
      },
    }
  )
}
