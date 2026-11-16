import Link from "next/link"

import { StatusBadge } from "@/components/admin/status-badge"
import { StatCard } from "@/components/admin/stat-card"
import { DbSetupNotice } from "@/components/db-setup-notice"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import {
  BOOKING_STATUSES,
  type BookingStatus,
  type BookingWithRelations,
} from "@/lib/types"

export const metadata = {
  title: "Админ-панель — АвтоХирургия",
}

// Рендеринг на каждый запрос (Next 16, Cache Components).
export const instant = false

const BOOKING_SELECT =
  "id, booking_date, booking_time, status, comment, cancel_reason, created_at, clients(name, phone), vehicles(brand, model, year, license_plate), services(title)"

const STATUS_FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "confirmed", label: "Подтверждённые" },
  { value: "cancelled", label: "Отменённые" },
  { value: "completed", label: "Выполненные" },
]

function formatDate(iso: string): string {
  return iso
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>
}) {
  const { status, sort } = await searchParams
  const activeStatus = (BOOKING_STATUSES as string[]).includes(status ?? "")
    ? (status as BookingStatus)
    : "all"
  const sortBy = sort === "created" ? "created" : "visit"

  const counts: Record<BookingStatus, number> = {
    new: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
  }
  let bookings: BookingWithRelations[] = []
  let latestNew: BookingWithRelations[] = []
  let loadError: "not-configured" | "db-error" | null = null

  try {
    const supabase = await createClient()

    await Promise.all(
      BOOKING_STATUSES.map(async (s) => {
        const { count } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", s)
        counts[s] = count ?? 0
      })
    )

    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true })

    if (activeStatus !== "all") query = query.eq("status", activeStatus)

    if (sortBy === "created") {
      query = query.order("created_at", { ascending: false })
    }

    const { data, error } = await query.limit(100)
    if (error) loadError = "db-error"
    else bookings = (data as unknown as BookingWithRelations[]) ?? []

    const { data: latest } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5)
    latestNew = (latest as unknown as BookingWithRelations[]) ?? []
  } catch {
    loadError = "not-configured"
  }

  const hrefFor = (params: Record<string, string>) => {
    const sp = new URLSearchParams()
    if (params.status && params.status !== "all") sp.set("status", params.status)
    if (params.sort && params.sort !== "visit") sp.set("sort", params.sort)
    const qs = sp.toString()
    return qs ? `/admin?${qs}` : "/admin"
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Заявки</h1>

      {loadError === "not-configured" ? (
        <DbSetupNotice />
      ) : loadError === "db-error" ? (
        <Card>
          <CardHeader>
            <CardTitle>Данные недоступны</CardTitle>
            <CardDescription>
              Не удалось загрузить заявки. Проверьте, что миграция
              0001_init.sql применена и сервер перезапущен после изменения
              .env.local.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Новые" value={String(counts.new)} />
            <StatCard title="Подтверждённые" value={String(counts.confirmed)} />
            <StatCard title="Отменённые" value={String(counts.cancelled)} />
            <StatCard title="Выполненные" value={String(counts.completed)} />
          </section>

          {latestNew.length > 0 ? (
            <Card className="py-4">
              <CardHeader className="px-5 pb-2">
                <CardTitle className="text-base">Последние новые заявки</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <ul className="flex flex-col divide-y text-sm">
                  {latestNew.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/admin/${b.id}`}
                        className="flex items-center justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate">
                          {b.clients?.name ?? "—"} · {b.services?.title ?? "—"}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatDate(b.booking_date)} {formatTime(b.booking_time)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Все заявки</CardTitle>
                <div className="ml-auto flex gap-1">
                  {(
                    [
                      { value: "visit", label: "По дате визита" },
                      { value: "created", label: "По дате создания" },
                    ] as const
                  ).map((s) => (
                    <Link
                      key={s.value}
                      href={hrefFor({
                        status: activeStatus,
                        sort: s.value,
                      })}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                        sortBy === s.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <Link
                    key={f.value}
                    href={hrefFor({ status: f.value, sort: sortBy })}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      activeStatus === f.value
                        ? "border-primary bg-primary/5 font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Дата</th>
                      <th className="pb-2 pr-3 font-medium">Время</th>
                      <th className="pb-2 pr-3 font-medium">Клиент</th>
                      <th className="pb-2 pr-3 font-medium">Телефон</th>
                      <th className="pb-2 pr-3 font-medium">Автомобиль</th>
                      <th className="pb-2 pr-3 font-medium">Услуга</th>
                      <th className="pb-2 pr-3 font-medium">Статус</th>
                      <th className="pb-2 font-medium">Создана</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Заявок с выбранным фильтром нет.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => (
                        <tr
                          key={b.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/admin/${b.id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {formatDate(b.booking_date)}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-3">{formatTime(b.booking_time)}</td>
                          <td className="py-2.5 pr-3">{b.clients?.name ?? "—"}</td>
                          <td className="py-2.5 pr-3">{b.clients?.phone ?? "—"}</td>
                          <td className="py-2.5 pr-3">
                            {b.vehicles
                              ? `${b.vehicles.brand} ${b.vehicles.model}`
                              : "—"}
                          </td>
                          <td className="max-w-48 truncate py-2.5 pr-3">
                            {b.services?.title ?? "—"}
                          </td>
                          <td className="py-2.5 pr-3">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="py-2.5 text-xs text-muted-foreground">
                            {b.created_at.slice(0, 10)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}
