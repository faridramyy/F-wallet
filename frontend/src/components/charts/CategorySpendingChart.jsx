import { SectionCard } from "../common/SectionCard";
import { formatCents, formatPercent } from "../../lib/formatters";

// Where this month's spending went: ranked bars, one hue, each row labeled
// with its amount and share (so the figures are readable without hover).
//   items: [{ id, name, cents }] largest first
export function CategorySpendingChart({ items, monthLabel, currency }) {
  const total = items.reduce((sum, item) => sum + item.cents, 0);
  const largest = items[0]?.cents ?? 0;

  return (
    <SectionCard
      title="Spending by category"
      description={`Expenses in ${monthLabel}`}
      contentClassName="space-y-4"
    >
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No expenses recorded in {monthLabel}.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 tabular-nums">
                  {formatCents(item.cents, currency)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatPercent(item.cents / total)}
                  </span>
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-chart-expense"
                  style={{ width: `${(item.cents / largest) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <p className="flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">
            {formatCents(total, currency)}
          </span>
        </p>
      )}
    </SectionCard>
  );
}
