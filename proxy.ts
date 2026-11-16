import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

function getEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && anonKey ? { url, anonKey } : null
}

/**
 * Next 16: middleware называется proxy (proxy.ts в корне).
 * Защита /admin: неавторизованный попадает на /admin/login,
 * авторизованный с /admin/login — в панель. Плюс обновление сессии.
 */
export async function proxy(request: NextRequest) {
  const env = getEnv()
  if (!env) {
    // Supabase не настроен — страницы сами покажут подсказку по настройке.
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === "/admin/login"

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
