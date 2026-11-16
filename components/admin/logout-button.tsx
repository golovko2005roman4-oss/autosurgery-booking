"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleLogout() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await createClient().auth.signOut()
    } catch {
      // Нет конфигурации Supabase — просто возвращаемся на страницу входа.
    }
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isSigningOut}>
      {isSigningOut ? "Выход…" : "Выйти"}
    </Button>
  )
}
