import { SiteHeader } from "@/components/site-header"
import { DemoNotice } from "@/components/booking/demo-notice"
import { DbSetupNotice } from "@/components/db-setup-notice"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { PublicBooking } from "@/lib/types"

// Рендеринг на каждый запрос: страница использует runtime-параметр id
// и не должна пререндериться (Next 16, Cache Components).
export const instant = false

export const metadata = {
  title: "Заявка принята — АвтоХирургия",
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let booking: PublicBooking | null = null
  let loadError: "not-configured" | "db-error" | "not-found" | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_booking_public", {
      p_id: id,
    })
    if (error) {
      loadError = error.message.includes("BOOKING_NOT_FOUND")
        ? "not-found"
        : "db-error"
    } else {
      booking = data as PublicBooking
    }
  } catch {
    loadError = "not-configured"
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-col items-start gap-3">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">
            ДЕМО-РАСПИСАНИЕ
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Заявка принята
          </h1>
        </div>

        {loadError === "not-configured" ? (
          <DbSetupNotice />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Заявка принята</CardTitle>
            <CardDescription>
              Администратор подтвердит время по телефону.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loadError === "not-found" ? (
              <p className="text-sm text-muted-foreground">
                Заявка не найдена. Проверьте ссылку — возможно, запись была
                отклонена или удалена.
              </p>
            ) : loadError === "db-error" ? (
              <p className="text-sm text-muted-foreground">
                Не удалось загрузить заявку. Проверьте, что миграция
                0001_init.sql применена, и перезагрузите страницу.
              </p>
            ) : booking ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Номер заявки</dt>
                  <dd className="mt-0.5 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                    {booking.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Услуга</dt>
                  <dd className="mt-0.5 font-medium">{booking.service_title}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Автомобиль</dt>
                  <dd className="mt-0.5 font-medium">
                    {booking.brand} {booking.model}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-muted-foreground">Дата</dt>
                    <dd className="mt-0.5 font-medium">{booking.booking_date}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Время</dt>
                    <dd className="mt-0.5 font-medium">{booking.booking_time}</dd>
                  </div>
                </div>
              </dl>
            ) : null}
            <DemoNotice />
          </CardContent>
        </Card>
        )}
      </main>
    </>
  )
}
