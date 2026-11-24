import { cn } from "cn";

import { formatCurrency } from "../../lib/formatters";

// Bar color for how much of a limit is used.
function usageTone(percent) {
  if (percent > 90) return "bg-destructive";
  if (percent > 70) return "bg-warning";
  return "bg-income";
}

// How much of a limit is used: "42% used · $580.00 available" over a thin
// bar that turns amber past 70% and red past 90%. Used for credit-card
// limits and category budgets. Amounts are in dollars.
//   remainingLabel: word after the amount left ("available", "left")
function UsageBar({
  used,
  limit,
  currency,
  label,
  remainingLabel = "available",
  className,
}) {
  const percent = limit > 0 ? (used / limit) * 100 : 0;
  const over = used - limit;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
        <span className="shrink-0">{percent.toFixed(0)}% used</span>
        <span
          className={cn("truncate text-right", over > 0 && "text-destructive")}
        >
          {over > 0
            ? `${formatCurrency(over, currency)} over`
            : `${formatCurrency(limit - used, currency)} ${remainingLabel}`}
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            usageTone(percent),
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export { UsageBar };
