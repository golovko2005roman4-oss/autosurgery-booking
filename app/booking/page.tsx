import { SiteHeader } from "@/components/site-header"
import { DemoNotice } from "@/components/booking/demo-notice"
import { DbSetupNotice } from "@/components/db-setup-notice"
import { BookingFlow } from "@/components/booking/booking-flow"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { Service } from "@/lib/types"

export const metadata = {
  title: "Онлайн-запись — АвтоХирургия",
}

// Рендеринг на каждый запрос: загрузка услуг из БД — runtime-данные
// (Next 16, Cache Components).
export const instant = false

export default async function BookingPage() {
  let services: Service[] = []
  let loadError: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("services")
      .select("id, title, price_from")
      .eq("is_active", true)
      .order("title")
    if (error) loadError = "db-error"
    else services = (data as Service[]) ?? []
  } catch {
    loadError = "not-configured"
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-3">
          <DemoNotice />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Онлайн-запись
          </h1>
        </div>

        {loadError === "not-configured" ? (
          <DbSetupNotice />
        ) : loadError === "db-error" ? (
          <Card>
            <CardHeader>
              <CardTitle>Запись временно недоступна</CardTitle>
              <CardDescription>
                Не удалось загрузить услуги. Проверьте, что миграция
                0001_init.sql применена, и перезагрузите страницу.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : services.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Услуги не найдены</CardTitle>
              <CardDescription>
                В базе нет активных услуг. Проверьте, что seed.sql применён.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Запись на обслуживание</CardTitle>
              <CardDescription>
                Выберите услугу, автомобиль и удобное время — это займёт пару
                минут.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingFlow services={services} />
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
