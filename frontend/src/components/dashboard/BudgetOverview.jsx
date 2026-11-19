import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { budgets } from "../../data/mockData";
import { formatCurrency } from "../../lib/formatters";

export function BudgetOverview({ onManage }) {
  return (
    <Card className="rounded-2xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Monthly budgets</CardTitle>
        <p className="text-xs text-muted-foreground">
          Spending against monthly limits
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {budgets.map((budget) => {
          const percentage =
            budget.limit > 0
              ? Math.round((budget.spent / budget.limit) * 100)
              : 0;

          return (
            <div key={budget.name}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-card-foreground">
                  {budget.name}
                </p>

                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(budget.spent)} /{" "}
                  {formatCurrency(budget.limit)}
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
        })}

        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={onManage}
        >
          Manage budgets
        </Button>
      </CardContent>
    </Card>
  );
}
