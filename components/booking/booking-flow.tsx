"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { createBooking } from "@/app/actions/booking"
import { DemoNotice } from "@/components/booking/demo-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  DEMO_SLOTS,
  getDemoDates,
  type DemoSlot,
} from "@/lib/schedule"
import type { Service } from "@/lib/types"
import {
  bookingFormSchema,
  formatPhoneInput,
  normalizePhone,
} from "@/lib/validations/booking"

const STEPS = ["Услуга", "Автомобиль", "Дата", "Время", "Контакты"] as const

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

interface FlowState {
  serviceId: string | null
  brand: string
  model: string
  year: string
  licensePlate: string
  date: string | null
  time: DemoSlot | null
  name: string
  phone: string
  comment: string
}

const INITIAL_STATE: FlowState = {
  serviceId: null,
  brand: "",
  model: "",
  year: "",
  licensePlate: "",
  date: null,
  time: null,
  name: "",
  phone: "",
  comment: "",
}

export function BookingFlow({ services }: { services: Service[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FlowState>(INITIAL_STATE)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAllServices, setShowAllServices] = useState(false)
  const dates = useMemo(() => getDemoDates(), [])
  const chosenService = services.find((s) => s.id === form.serviceId) ?? null

  // Показываем первые 5 услуг; остальные — по кнопке «Ещё» (список слишком длинный).
  const VISIBLE_SERVICES = 5
  const selectedServiceIndex = services.findIndex((s) => s.id === form.serviceId)
  const servicesExpanded =
    showAllServices || selectedServiceIndex >= VISIBLE_SERVICES
  const visibleServices = servicesExpanded
    ? services
    : services.slice(0, VISIBLE_SERVICES)
  const hiddenCount = services.length - VISIBLE_SERVICES

  // Занятые (подтверждённые) слоты для выбранной даты.
  // Храним пару {date, slots}, чтобы не показывать слоты от другой даты.
  const [slotsState, setSlotsState] = useState<{
    date: string
    slots: string[]
  } | null>(null)
  const [slotsError, setSlotsError] = useState(false)

  useEffect(() => {
    if (step !== 3 || !form.date) return
    let cancelled = false
    createClient()
      .rpc("get_booked_slots", { p_date: form.date })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setSlotsError(true)
          return
        }
        setSlotsError(false)
        setSlotsState({
          date: form.date!,
          slots: (data as { slot_time: string }[]).map((r) =>
            r.slot_time.slice(0, 5)
          ),
        })
      })
    return () => {
      cancelled = true
    }
  }, [step, form.date])

  // Пока ответ от БД не пришёл для текущей даты — считаем слоты загружающимися,
  // чтобы не показать неверное состояние (занятые окна появляются с задержкой).
  const slotsLoading =
    step === 3 && !!form.date && (!slotsState || slotsState.date !== form.date)

  const bookedSlots =
    slotsState && slotsState.date === form.date ? slotsState.slots : []

  function update<K extends keyof FlowState>(key: K, value: FlowState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validateCurrentStep(): boolean {
    const errors: Record<string, string> = {}
    if (step === 0 && !form.serviceId) errors.serviceId = "Выберите услугу"
    if (step === 1) {
      if (!form.brand.trim()) errors.brand = "Укажите марку"
      if (!form.model.trim()) errors.model = "Укажите модель"
      if (form.year && !/^\d{4}$/.test(form.year))
        errors.year = "Год — четыре цифры, например 2019"
    }
    if (step === 2 && !form.date) errors.date = "Выберите дату"
    if (step === 3 && !form.time) errors.time = "Выберите время"
    if (step === 4) {
      if (!form.name.trim()) errors.name = "Введите имя"
      const phoneCheck = bookingFormSchema.shape.phone.safeParse(form.phone)
      if (!phoneCheck.success) errors.phone = "Введите номер в формате +7 9XX XXX-XX-XX"
      if (form.comment.length > 500)
        errors.comment = "Комментарий — не более 500 символов"
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function next() {
    if (validateCurrentStep()) {
      setSubmitError(null)
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }
  }

  function back() {
    setSubmitError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function submit() {
    if (isSubmitting || !validateCurrentStep()) return
    setIsSubmitting(true)
    setSubmitError(null)

    const result = await createBooking({
      service_id: form.serviceId!,
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: form.year ? Number(form.year) : undefined,
      license_plate: form.licensePlate.trim() || undefined,
      booking_date: form.date!,
      booking_time: form.time!,
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      comment: form.comment.trim() || undefined,
    })

    setIsSubmitting(false)
    if (result.ok) {
      router.push(`/confirmation/${result.bookingId}`)
    } else {
      setSubmitError(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Прогресс */}
      <div className="flex items-center gap-2" aria-label="Прогресс записи">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1">
            <div
              className={`h-1.5 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
            <span
              className={`text-[11px] ${
                i === step
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Сводка выбранного */}
      {step > 0 ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {chosenService?.title}
          {form.date ? ` · ${form.date}` : ""}
          {form.time ? ` · ${form.time}` : ""}
        </p>
      ) : null}

      {/* Шаг 1. Услуга */}
      {step === 0 ? (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Услуга">
          {visibleServices.map((service) => (
            <button
              key={service.id}
              type="button"
              role="radio"
              aria-checked={form.serviceId === service.id}
              onClick={() => update("serviceId", service.id)}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                form.serviceId === service.id
                  ? "border-primary bg-primary/5 font-medium"
                  : "hover:bg-accent"
              }`}
            >
              <span>{service.title}</span>
              {service.price_from != null ? (
                <span className="shrink-0 text-muted-foreground">
                  от {service.price_from.toLocaleString("ru-RU")} ₽
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">
                  цена по телефону
                </span>
              )}
            </button>
          ))}
          {fieldErrors.serviceId ? (
            <p className="text-sm text-destructive">{fieldErrors.serviceId}</p>
          ) : null}
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllServices((v) => !v)}
              aria-expanded={servicesExpanded}
              className="mt-1 min-h-11 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {servicesExpanded
                ? "Свернуть список"
                : `Ещё ${hiddenCount} ${plural(hiddenCount, "услуга", "услуги", "услуг")}`}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Шаг 2. Автомобиль */}
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand">Марка *</Label>
            <Input
              id="brand"
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              placeholder="Например: Kia"
              autoComplete="off"
            />
            {fieldErrors.brand ? (
              <p className="text-sm text-destructive">{fieldErrors.brand}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Модель *</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="Например: Rio"
              autoComplete="off"
            />
            {fieldErrors.model ? (
              <p className="text-sm text-destructive">{fieldErrors.model}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="year">Год</Label>
              <Input
                id="year"
                inputMode="numeric"
                value={form.year}
                onChange={(e) => update("year", e.target.value)}
                placeholder="2019"
                autoComplete="off"
              />
              {fieldErrors.year ? (
                <p className="text-sm text-destructive">{fieldErrors.year}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate">Госномер</Label>
              <Input
                id="plate"
                value={form.licensePlate}
                onChange={(e) => update("licensePlate", e.target.value)}
                placeholder="А111ВС54"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Шаг 3. Дата */}
      {step === 2 ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {dates.map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => {
                  update("date", d.iso)
                  update("time", null)
                }}
                aria-pressed={form.date === d.iso}
                className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors ${
                  form.date === d.iso
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <span className="text-xs opacity-75">{d.weekday}</span>
                <span className="font-medium">{d.label}</span>
              </button>
            ))}
          </div>
          {fieldErrors.date ? (
            <p className="text-sm text-destructive">{fieldErrors.date}</p>
          ) : null}
          <DemoNotice />
        </div>
      ) : null}

      {/* Шаг 4. Время */}
      {step === 3 ? (
        <div className="flex flex-col gap-3">
          {!form.date ? (
            <p className="text-sm text-muted-foreground">Сначала выберите дату.</p>
          ) : slotsError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Не удалось загрузить занятые окна. Обновите страницу или попробуйте
              позже.
            </p>
          ) : slotsLoading ? (
            <div
              className="flex min-h-11 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Загрузка слотов…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_SLOTS.map((slot) => {
                  const booked = bookedSlots.includes(slot)
                  const selected = form.time === slot
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={booked}
                      onClick={() => update("time", slot)}
                      aria-pressed={selected}
                      className={`min-h-11 rounded-lg border text-sm font-medium transition-colors ${
                        booked
                          ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground line-through"
                          : selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
              {bookedSlots.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Зачёркнутые окна уже заняты подтверждёнными заявками.
                </p>
              ) : null}
              {fieldErrors.time ? (
                <p className="text-sm text-destructive">{fieldErrors.time}</p>
              ) : null}
            </>
          )}
          <DemoNotice />
        </div>
      ) : null}

      {/* Шаг 5. Контакты */}
      {step === 4 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Имя *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Как к вам обращаться"
              autoComplete="name"
            />
            {fieldErrors.name ? (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
              placeholder="+7 (9XX) XXX-XX-XX"
              autoComplete="tel"
              maxLength={18}
            />
            {fieldErrors.phone ? (
              <p className="text-sm text-destructive">{fieldErrors.phone}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={form.comment}
              onChange={(e) => update("comment", e.target.value)}
              placeholder="Например: стук спереди на неровностях"
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Необязательно, до 500 символов.
            </p>
          </div>
        </div>
      ) : null}

      {submitError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      {/* Навигация */}
      <div className="flex gap-2 pt-1">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={back} disabled={isSubmitting}>
            Назад
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button type="button" className="flex-1" onClick={next}>
            Далее
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Отправка…" : "Отправить заявку"}
          </Button>
        )}
      </div>
    </div>
  )
}
