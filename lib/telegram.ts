/**
 * ОПЦИОНАЛЬНЫЙ МОДУЛЬ — ЗАГЛУШКА.
 *
 * Уведомление администратору в Telegram о новой заявке.
 * Реализация — отдельным этапом (см. docs/requirements.md, F-17).
 * Приложение полностью работает без этого модуля.
 *
 * БЕЗОПАСНОСТЬ: токен бота используется ТОЛЬКО на сервере.
 *   - TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID — серверные переменные,
 *     НИКОГДА не добавлять в NEXT_PUBLIC_*.
 *   - Функция вызывается только из server actions / route handlers.
 */

interface NewBookingInfo {
  id: string
  name: string
  phone: string
  serviceTitle: string
  bookingDate: string
  bookingTime: string
}

export async function notifyAdminNewBooking(
  _booking: NewBookingInfo
): Promise<void> {
  // TODO(следующий этап): отправить сообщение через Bot API:
  //   fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, ...)
  // Если TELEGRAM_BOT_TOKEN не задан — молча пропускаем (модуль опционален).
  void _booking
}
