import { Card, CardContent } from "../ui/card";

export function AccountSummary({ label, value, description, icon: Icon }) {
  return (
    <Card className="rounded-xl border-border bg-card shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {value}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon size={21} strokeWidth={1.8} />
        </div>
      </CardContent>
    </Card>
  );
}
