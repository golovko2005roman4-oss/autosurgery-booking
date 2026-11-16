import { Badge } from "@/components/ui/badge"

/**
 * Постоянная пометка о том, что расписание демонстрационное.
 * Требование ТЗ: явно отделять DEMO DATA от REAL BUSINESS DATA.
 */
export function DemoNotice() {
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Демо-расписание — не является реальным расписанием СТО
    </Badge>
  )
}
