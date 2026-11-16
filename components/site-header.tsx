import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            АХ
          </span>
          <span className="text-base font-semibold tracking-tight">
            АвтоХирургия
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            · онлайн-запись
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/booking"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Запись
          </Link>
          <Link
            href="/admin/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Админ
          </Link>
        </nav>
      </div>
    </header>
  )
}
