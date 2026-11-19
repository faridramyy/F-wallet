import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { budgets } from "../data/mockData";
import { formatCurrency } from "../lib/formatters";

export function BudgetsPage() {
  return (
    <Card className="rounded-2xl border-border bg-card text-card-foreground shadow-sm transition-colors duration-200">
      <CardHeader>
        <CardTitle className="text-base text-card-foreground">
          Monthly budgets
        </CardTitle>

        <p className="text-xs text-muted-foreground">
          Track your category spending
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {budgets.map((budget) => {
          const percentage = Math.round((budget.spent / budget.limit) * 100);

          return (
            <div key={budget.name}>
              <div className="mb-2 flex justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {budget.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  {formatCurrency(budget.spent)} of{" "}
                  {formatCurrency(budget.limit)}
                </p>
              </div>

              <Progress value={percentage} className="h-2 bg-muted" />

              <p className="mt-1 text-xs text-muted-foreground">
                {percentage}% used
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
