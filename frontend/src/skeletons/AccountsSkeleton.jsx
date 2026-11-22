import { Card, CardContent } from "../components/ui/card";

export function AccountsSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading accounts"
      aria-busy="true"
    >
      {[1, 2, 3].map((item) => (
        <Card key={item} className="rounded-xl border-border bg-card shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
