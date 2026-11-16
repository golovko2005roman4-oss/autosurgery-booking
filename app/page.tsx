import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DemoNotice } from "@/components/booking/demo-notice"

const steps = [
  {
    title: "Выберите услугу",
    description: "Замена масла, диагностика, ремонт ходовой и другие работы.",
  },
  {
    title: "Выберите дату и время",
    description: "Видны только свободные окна — без звонков и ожидания.",
  },
  {
    title: "Получите подтверждение",
    description:
      "Администратор подтвердит заявку и свяжется с вами по телефону.",
  },
]

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
        <section className="flex flex-col items-start gap-4">
          <DemoNotice />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Запись на обслуживание онлайн
          </h1>
          <p className="max-w-xl text-muted-foreground">
            СТО «АвтоХирургия», Новосибирск, ул. Ядринцевская, 74а. Работаем
            ежедневно. Выберите услугу и удобное время — за пару минут, без
            звонков.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/booking">Записаться на обслуживание</Link>
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <Card key={step.title} className="py-5">
              <CardHeader className="px-5 pb-2">
                <div className="text-sm font-medium text-primary">
                  Шаг {i + 1}
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <CardDescription>{step.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 text-xs text-muted-foreground">
          Демонстрационный MVP · данные расписания не являются реальными
        </div>
      </footer>
    </>
  )
}
