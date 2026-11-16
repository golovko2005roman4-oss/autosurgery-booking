// ⚠️ DEMO DATA — НЕ является реальным расписанием СТО «АвтоХирургия».
// Реальные правила расписания неизвестны (docs/research.md, раздел 12).
// См. docs/requirements.md, раздел 5.3.

/** Сколько дней вперёд доступно демонстрационное расписание. */
export const DEMO_SCHEDULE_DAYS = 14

/**
 * Демонстрационные слоты (ежедневно).
 * Единственное ограничение демо: 1 активная заявка на слот
 * (settings.capacity_per_slot = 1).
 */
export const DEMO_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
] as const

export type DemoSlot = (typeof DEMO_SLOTS)[number]

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"]
const MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
]

export interface DemoDate {
  /** YYYY-MM-DD */
  iso: string
  label: string
  weekday: string
}

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Ближайшие DEMO_SCHEDULE_DAYS дней, начиная с сегодняшнего. */
export function getDemoDates(): DemoDate[] {
  const result: DemoDate[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < DEMO_SCHEDULE_DAYS; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    result.push({
      iso: toIso(date),
      label: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      weekday: i === 0 ? "сегодня" : WEEKDAYS[date.getDay()],
    })
  }
  return result
}

/** Проверка, что строка времени входит в демо-расписание. */
export function isDemoSlot(time: string): time is DemoSlot {
  return (DEMO_SLOTS as readonly string[]).includes(time)
}

/** Проверка, что дата находится внутри демо-периода (сегодня .. +DEMO_SCHEDULE_DAYS). */
export function isWithinDemoPeriod(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(today)
  end.setDate(end.getDate() + DEMO_SCHEDULE_DAYS)

  return date >= today && date < end
}
