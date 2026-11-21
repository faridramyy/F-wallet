import { Skeleton } from "../components/ui/skeleton";
import { Card, CardContent, CardHeader } from "../components/ui/card";

const cardClass =
  "rounded-xl border-border bg-card text-card-foreground shadow-sm";

function SectionHeadingSkeleton({ titleWidth = "w-40", descWidth = "w-64" }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />

      <div className="space-y-2">
        <Skeleton className={`h-5 ${titleWidth} max-w-full`} />
        <Skeleton className={`h-4 ${descWidth} max-w-full`} />
      </div>
    </div>
  );
}

function FieldSkeleton({ labelWidth = "w-20", hasDescription = false }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className="h-11 w-full rounded-lg" />
      {hasDescription && <Skeleton className="h-3 w-64 max-w-full" />}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-7">
      {/* Account preferences */}
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <SectionHeadingSkeleton titleWidth="w-44" descWidth="w-72" />
        </CardHeader>

        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldSkeleton labelWidth="w-16" />
            <FieldSkeleton labelWidth="w-20" />
            <FieldSkeleton labelWidth="w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <SectionHeadingSkeleton titleWidth="w-28" descWidth="w-64" />
        </CardHeader>

        <CardContent>
          <FieldSkeleton labelWidth="w-32" />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <SectionHeadingSkeleton titleWidth="w-32" descWidth="w-80" />
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-72 max-w-full" />
                </div>

                <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recurring transactions */}
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <SectionHeadingSkeleton titleWidth="w-44" descWidth="w-80" />
        </CardHeader>

        <CardContent>
          <FieldSkeleton labelWidth="w-32" hasDescription />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <Skeleton className="h-11 w-full rounded-lg sm:w-32" />
        <Skeleton className="h-11 w-full rounded-lg sm:w-40" />
      </div>
    </div>
  );
}

export default SettingsSkeleton;
