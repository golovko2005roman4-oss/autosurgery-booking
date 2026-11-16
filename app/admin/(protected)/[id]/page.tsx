import { notFound } from "next/navigation"

import { BookingActions } from "@/components/admin/booking-actions"
import { StatusBadge } from "@/components/admin/status-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { BookingWithRelations } from "@/lib/types"

// Рендеринг на каждый запрос (Next 16, Cache Components).
export const instant = false

export default async function AdminBookingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let booking: BookingWithRelations | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, status, comment, cancel_reason, created_at, clients(name, phone), vehicles(brand, model, year, license_plate), services(title)"
      )
      .eq("id", id)
      .single()
    if (error || !data) notFound()
    booking = data as unknown as BookingWithRelations
  } catch {
    // Нет БД / нет доступа — показываем 404.
    notFound()
  }

  const rows: [string, string][] = [
    ["Клиент", booking.clients?.name ?? "—"],
    ["Телефон", booking.clients?.phone ?? "—"],
    [
      "Автомобиль",
      booking.vehicles
        ? `${booking.vehicles.brand} ${booking.vehicles.model}${
            booking.vehicles.year ? `, ${booking.vehicles.year}` : ""
          }${booking.vehicles.license_plate ? ` · ${booking.vehicles.license_plate}` : ""}`
        : "—",
    ],
    ["Услуга", booking.services?.title ?? "—"],
    ["Дата", booking.booking_date],
    ["Время", booking.booking_time.slice(0, 5)],
    ["Комментарий", booking.comment || "—"],
    ["Статус", ""],
    ["Создана", booking.created_at.slice(0, 16).replace("T", " ")],
    ...(booking.cancel_reason ? [["Причина отмены", booking.cancel_reason]] : []),
  ] as [string, string][]

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Заявка</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {booking.services?.title ?? "Заявка"}
            <StatusBadge status={booking.status} />
          </CardTitle>
          <CardDescription>
            {booking.booking_date} · {booking.booking_time.slice(0, 5)} ·{" "}
            {booking.clients?.name ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium">
                  {label === "Статус" ? (
                    <StatusBadge status={booking.status} />
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <BookingActions
            bookingId={booking.id}
            status={booking.status}
            bookingDate={booking.booking_date}
            bookingTime={booking.booking_time}
          />
        </CardContent>
      </Card>
    </main>
  )
}
