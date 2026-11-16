import { Badge } from "@/components/ui/badge"
import type { BookingStatus } from "@/lib/types"

const STATUS_META: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  new: { label: "Новая", className: "bg-blue-600 text-white hover:bg-blue-600" },
  confirmed: {
    label: "Подтверждена",
    className: "bg-green-600 text-white hover:bg-green-600",
  },
  cancelled: {
    label: "Отменена",
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
  completed: {
    label: "Выполнена",
    className: "bg-yellow-400 text-yellow-950 hover:bg-yellow-400",
  },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status] ?? { label: status, className: "" }
  return <Badge className={meta.className}>{meta.label}</Badge>
}
