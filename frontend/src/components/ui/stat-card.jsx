import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "cn";

const ICON_TONES = {
  default: "bg-muted text-muted-foreground",
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  transfer: "bg-transfer/10 text-transfer",
  warning: "bg-warning/10 text-warning",
};

// Signed change vs a named period. `goodWhen` says which direction is good
// news ("up" for income, "down" for spending); that picks the color.
function Delta({ value, goodWhen = "up", label }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const isUp = value >= 0;
  const isGood = value === 0 || (goodWhen === "up") === isUp;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        isGood ? "text-income" : "text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {Math.abs(value * 100).toFixed(0)}%
      <span className="sr-only">{isUp ? "increase" : "decrease"}</span>
      {label && (
        <span className="ml-1 font-normal text-muted-foreground">{label}</span>
      )}
    </span>
  );
}

// Overview tile: label, headline value, optional icon, change and caption.
//   delta: { value: 0.12, goodWhen: "down", label: "vs last month" }
function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  valueClassName,
  delta,
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>

        {Icon && (
          <div className={cn("rounded-lg p-2", ICON_TONES[tone])}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <p
        className={cn(
          "mt-3 truncate text-2xl font-semibold tracking-tight",
          valueClassName,
        )}
      >
        {value}
      </p>

      {(delta || description) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {delta && <Delta {...delta} />}
          {description && <span className="truncate">{description}</span>}
        </p>
      )}
    </div>
  );
}

const GRID_COLUMNS = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

// The standard row of overview tiles: one column on phones, then 3 or 4.
function StatGrid({ columns = 4, className, children }) {
  return (
    <section className={cn("grid gap-4", GRID_COLUMNS[columns], className)}>
      {children}
    </section>
  );
}

export { StatCard, StatGrid };
