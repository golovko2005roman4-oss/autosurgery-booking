import { z } from "zod"

// Валидация формы записи по docs/requirements.md (разделы 5.2, 10).
// Используется серверными action'ами на следующем этапе.

/** Российский номер телефона: 11 цифр, начиная с 7 или 8. */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+7\d{10}$/, "Введите номер в формате +7 9XX XXX-XX-XX"))

/** Приводит телефон к виду +7XXXXXXXXXX. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("8")) return `+7${digits.slice(1)}`
  if (digits.startsWith("7")) return `+${digits}`
  return `+7${digits}`
}

/** Форматирует ввод телефона в маску +7 (9XX) XXX-XX-XX. */
export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`
  if (!digits.startsWith("7")) digits = `7${digits}`
  digits = digits.slice(0, 11)

  const p = digits.slice(1)
  const part = (from: number, len: number) => p.slice(from, from + len)
  let result = "+7"
  if (p.length > 0) result += ` (${part(0, 3)}`
  if (p.length >= 3) result += ")"
  if (p.length > 3) result += ` ${part(3, 3)}`
  if (p.length > 6) result += `-${part(6, 2)}`
  if (p.length > 8) result += `-${part(8, 2)}`
  return result
}

export const bookingFormSchema = z.object({
  service_id: z.string().uuid("Выберите услугу"),
  brand: z.string().trim().min(1, "Укажите марку автомобиля"),
  model: z.string().trim().min(1, "Укажите модель автомобиля"),
  year: z
    .number()
    .int()
    .min(1950, "Год слишком ранний")
    .max(2100, "Год слишком поздний")
    .optional(),
  license_plate: z.string().trim().max(12).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Неверная дата"),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, "Неверное время"),
  name: z.string().trim().min(1, "Введите имя"),
  phone: phoneSchema,
  comment: z.string().trim().max(500, "Комментарий — не более 500 символов").optional(),
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>
