import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { budgets } from "../../data/mockData";
import { formatCurrency } from "../../lib/formatters";

export function BudgetOverview({ onManage }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Monthly budgets</CardTitle>
        <p className="text-xs text-slate-400">
          Spending against monthly limits
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {budgets.map((budget) => {
          const percentage = Math.round((budget.spent / budget.limit) * 100);
          return (
            <div key={budget.name}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{budget.name}</p>
                <p className="text-xs tabular-nums text-slate-500">
                  {formatCurrency(budget.spent)} /{" "}
                  {formatCurrency(budget.limit)}
                </p>
              </div>
              <Progress value={percentage} className="h-2 bg-slate-100" />
              <p className="mt-1.5 text-right text-xs text-slate-400">
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
