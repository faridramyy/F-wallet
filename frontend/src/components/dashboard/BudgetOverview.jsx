import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { useAppData } from "../providers/useAppData";
import { formatCurrency, getCurrentYearMonth } from "../../lib/formatters";

export function BudgetOverview() {
  const navigate = useNavigate();
  const { budgets, settings, transactions } = useAppData();
  const currency = settings?.currency ?? "CAD";

  const { year, month, prefix: thisMonth } = getCurrentYearMonth();

  const currentBudget = budgets.find(
    (b) => Number(b.budget_year) === year && Number(b.budget_month) === month,
  );

  // Compute spending per category for expense transactions this month.
  const spendingByCategory = {};
  transactions
    .filter(
      (t) =>
        t.transaction_type === "expense" &&
        t.transaction_date?.startsWith(thisMonth),
    )
    .forEach((t) => {
      if (t.category_id) {
        spendingByCategory[t.category_id] =
          (spendingByCategory[t.category_id] ?? 0) +
          Number(t.amount_cents ?? 0);
      }
    });

  const items = currentBudget
    ? currentBudget.allocations
        .filter(
          (a) =>
            a.category_type === "expense" && !a.category_is_archived,
        )
        .map((a) => ({
          id: a.budget_category_id ?? a.category_id,
          name: a.category_name,
          spent: (spendingByCategory[a.category_id] ?? 0) / 100,
          limit: Number(a.allocated_cents ?? 0) / 100,
        }))
    : [];

  return (
    <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Monthly budgets</CardTitle>
        <p className="text-xs text-muted-foreground">
          Spending against monthly limits
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {currentBudget
              ? "No expense budget categories set."
              : "No budget for this month."}
          </p>
        ) : (
          items.map((item) => {
            const percentage =
              item.limit > 0
                ? Math.round((item.spent / item.limit) * 100)
                : 0;

            return (
              <div key={item.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-card-foreground">
                    {item.name}
                  </p>

                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatCurrency(item.spent, currency)} /{" "}
                    {formatCurrency(item.limit, currency)}
                  </p>
                </div>

                <Progress
                  value={Math.min(percentage, 100)}
                  className="h-2 bg-muted"
                />

                <p className="mt-1.5 text-right text-xs text-muted-foreground">
                  {percentage}% used
                </p>
              </div>
            );
          })
        )}

        <Button
          variant="outline"
          className="w-full rounded-lg"
          onClick={() => navigate("/categories")}
        >
          Manage budgets
        </Button>
      </CardContent>
    </Card>
  );
}
