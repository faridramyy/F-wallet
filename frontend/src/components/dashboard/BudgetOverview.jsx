import { Link } from "react-router-dom";

import { buttonVariants } from "../ui/button";
import { Progress } from "../ui/progress";
import { SectionCard } from "../common/SectionCard";
import { useAppData } from "../providers/useAppData";
import { formatCents } from "../../lib/formatters";
import {
  expenseCentsByCategory,
  getMonthBudget,
  monthKey,
} from "../../lib/analytics";

// Spending against the budget of the given month.
export function BudgetOverview({ year, month }) {
  const { budgets, settings, transactions } = useAppData();
  const currency = settings?.currency ?? "CAD";
  const prefix = monthKey(year, month);

  const { budget: currentBudget, allocations } = getMonthBudget(
    budgets,
    year,
    month,
  );

  const spending = expenseCentsByCategory(transactions, prefix);

  const items = allocations.map((a) => {
    const spentCents = spending[a.category_id] ?? 0;
    const limitCents = Number(a.allocated_cents ?? 0);

    return {
      id: a.budget_category_id ?? a.category_id,
      name: a.category_name,
      spentCents,
      limitCents,
      percent: limitCents > 0 ? Math.round((spentCents / limitCents) * 100) : 0,
    };
  });

  return (
    <SectionCard
      title="Monthly budgets"
      description="Spending against monthly limits"
      contentClassName="space-y-5"
    >
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {currentBudget
            ? "No expense budget categories set."
            : "No budget set for this month."}
        </p>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatCents(item.spentCents, currency)} /{" "}
                {formatCents(item.limitCents, currency)}
              </p>
            </div>

            <Progress
              value={Math.min(item.percent, 100)}
              aria-label={`${item.name} budget used`}
            />

            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {item.percent}% used
            </p>
          </div>
        ))
      )}

      <Link
        to="/categories"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        Manage budgets
      </Link>
    </SectionCard>
  );
}
