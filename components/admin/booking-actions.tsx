"use client"

import { useState, useTransition } from "react"

import {
  cancelBookingAction,
  completeBookingAction,
  confirmBookingAction,
  rescheduleBookingAction,
  type AdminActionResult,
} from "@/app/actions/admin"
import { DemoNotice } from "@/components/booking/demo-notice"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { getDemoDates } from "@/lib/schedule"
import type { BookingStatus } from "@/lib/types"

interface BookingActionsProps {
  bookingId: string
  status: BookingStatus
  bookingDate: string
  bookingTime: string
}

export function BookingActions({
  bookingId,
  status,
  bookingDate,
  bookingTime,
}: BookingActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [newDate, setNewDate] = useState<string | null>(null)
  const [newTime, setNewTime] = useState<string | null>(null)
  const [freeSlots, setFreeSlots] = useState<string[]>([])

  function runAction(action: () => Promise<AdminActionResult>, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        onSuccess?.()
      } else {
        setError(result.error)
      }
    })
  }

  async function openReschedule() {
    setRescheduleOpen(true)
    setNewDate(bookingDate)
    setNewTime(null)
    await loadFreeSlots(bookingDate)
  }

  async function loadFreeSlots(date: string) {
    setNewTime(null)
    setFreeSlots([])
    const { data } = await createClient().rpc("get_free_slots", {
      p_date: date,
      p_exclude_booking_id: bookingId,
    })
    if (data) {
      setFreeSlots((data as { slot: string }[]).map((r) => r.slot))
    }
  }

  const dates = getDemoDates()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {status === "new" ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => runAction(() => confirmBookingAction(bookingId))}
          >
            Подтвердить
          </Button>
        ) : null}

        {status === "confirmed" ? (
          <Button size="sm" variant="outline" disabled={isPending} onClick={openReschedule}>
            Перенести
          </Button>
        ) : null}

        {status === "confirmed" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => runAction(() => completeBookingAction(bookingId))}
          >
            Выполнено
          </Button>
        ) : null}

        {status === "new" || status === "confirmed" ? (
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isPending}>
                Отклонить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Отклонить заявку</DialogTitle>
                <DialogDescription>
                  Слот {bookingDate} {bookingTime.slice(0, 5)} снова станет свободным.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cancel-reason">Причина *</Label>
                <Textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Например: нет свободных постов / клиент перенёс визит"
                  rows={3}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelOpen(false)}>
                  Закрыть
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPending || !cancelReason.trim()}
                  onClick={() =>
                    runAction(
                      () => cancelBookingAction(bookingId, cancelReason.trim()),
                      () => {
                        setCancelOpen(false)
                        setCancelReason("")
                      }
                    )
                  }
                >
                  {isPending ? "Отклонение…" : "Отклонить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {/* Модальное окно переноса */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перенос заявки</DialogTitle>
            <DialogDescription>
              Текущий слот: {bookingDate} {bookingTime.slice(0, 5)}. Выберите новую
              дату и свободное время.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Новая дата</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => {
                      setNewDate(d.iso)
                      loadFreeSlots(d.iso)
                    }}
                    aria-pressed={newDate === d.iso}
                    className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors ${
                      newDate === d.iso
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    <span className="text-xs opacity-75">{d.weekday}</span>
                    <span className="font-medium">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Свободное время</Label>
              {newDate ? (
                freeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    На эту дату всё занято.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {freeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={newTime === slot}
                        onClick={() => setNewTime(slot)}
                        className={`min-h-11 rounded-lg border text-sm font-medium transition-colors ${
                          newTime === slot
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Сначала выберите дату.</p>
              )}
            </div>
            <DemoNotice />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Закрыть
            </Button>
            <Button
              disabled={isPending || !newDate || !newTime}
              onClick={() =>
                runAction(
                  () => rescheduleBookingAction(bookingId, newDate!, newTime!),
                  () => setRescheduleOpen(false)
                )
              }
            >
              {isPending ? "Перенос…" : "Подтвердить перенос"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && !cancelOpen && !rescheduleOpen ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
