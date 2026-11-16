import { redirect } from "next/navigation"

import { AdminHeader } from "@/components/admin/admin-header"
import { createClient } from "@/lib/supabase/server"

// Рендеринг на каждый запрос: проверка сессии — runtime-данные
// (Next 16, Cache Components).
export const instant = false

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let isAuthed = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isAuthed = Boolean(user)
  } catch {
    isAuthed = false
  }

  if (!isAuthed) {
    redirect("/admin/login")
  }

  return (
    <>
      <AdminHeader />
      {children}
    </>
  )
}
