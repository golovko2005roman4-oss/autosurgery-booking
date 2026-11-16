import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Понятное состояние «Supabase не настроен».
 * Показывается только когда .env.local отсутствует/неверен —
 * при корректной конфигурации приложение работает полностью.
 */
export function DbSetupNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Требуется подключение базы данных</CardTitle>
        <CardDescription>
          Демо использует Supabase. Чтобы форма записи и админка заработали:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
          <li>
            Создайте бесплатный проект на{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              supabase.com
            </a>
            .
          </li>
          <li>
            В <strong>SQL Editor</strong> выполните по очереди файлы{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              supabase/migrations/0001_init.sql
            </code>{" "}
            и{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              supabase/seed.sql
            </code>
            .
          </li>
          <li>
            В <strong>Authentication → Add user</strong> создайте пользователя
            администратора.
          </li>
          <li>
            Скопируйте{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              .env.example
            </code>{" "}
            в{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            и вставьте URL и anon key из <strong>Settings → API</strong>.
          </li>
          <li>Перезапустите сервер: npm run dev.</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Подробная инструкция — в README.md проекта.
        </p>
      </CardContent>
    </Card>
  )
}
