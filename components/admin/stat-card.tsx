import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Визуальный каркас карточки статистики для дашборда /admin.
 * Числа — демонстрационные, данные появятся после подключения базы.
 */
export function StatCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}
