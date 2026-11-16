import Link from "next/link"

import { LogoutButton } from "@/components/admin/logout-button"

export function AdminHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            АХ
          </span>
          <span className="text-base font-semibold tracking-tight">
            Админ-панель
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            · АвтоХирургия
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Сайт
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
