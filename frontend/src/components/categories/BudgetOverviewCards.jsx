import { PiggyBank, Target, TrendingDown, TrendingUp } from "lucide-react";

import { StatCard, StatGrid } from "../ui/stat-card";
import { useAppData } from "../providers/useAppData";
import { formatCents, formatMonthShortYear } from "../../lib/formatters";
import {
  getMonthBudget,
  getMonthContext,
  summarizeMonth,
} from "../../lib/analytics";

// This month's budget at a glance: what was planned, spent, left and earned.
export function BudgetOverviewCards() {
  const { budgets, transactions, currency } = useAppData();
  const money = (cents) => formatCents(cents, currency);

  const { current } = getMonthContext();
  const monthLabel = formatMonthShortYear(current.year, current.month);

  const { budget, totalCents } = getMonthBudget(
    budgets,
    current.year,
    current.month,
  );
  const { income, expense } = summarizeMonth(transactions, current.key);
  const leftCents = Math.max(totalCents - expense, 0);

  return (
    <StatGrid>
      <StatCard
        icon={Target}
        label="Total budget"
        value={money(totalCents)}
        description={
          budget ? "Across expense categories" : `No budget for ${monthLabel}`
        }
      />
      <StatCard
        icon={TrendingDown}
        tone="expense"
        label="Spent"
        value={money(expense)}
        description={monthLabel}
      />
      <StatCard
        icon={PiggyBank}
        tone={leftCents > 0 ? "income" : "warning"}
        label="Left to spend"
        value={money(leftCents)}
        description={monthLabel}
      />
      <StatCard
        icon={TrendingUp}
        tone="income"
        label="Income received"
        value={money(income)}
        description={monthLabel}
      />
    </StatGrid>
  );
}
