import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { StatCard, StatGrid } from "../ui/stat-card";
import { formatCents, formatPercent } from "../../lib/formatters";
import { percentChange } from "../../lib/analytics";

// The dashboard's four headline numbers for the chosen month. Changes
// compare it with the same days of the month before, so a half-finished
// month is never measured against a whole one.
//   thisMonth / lastMonthToDate: summarize() results
//   period: "this month" / "in October"
//   vsLabel: "vs last month" / "vs September"
// Every caption describes the chosen month; only the change arrow refers to
// the month before (shown when there is something to compare with).
export function OverviewCards({
  netWorthCents,
  accountCount,
  thisMonth,
  lastMonthToDate,
  period,
  vsLabel,
  currency,
}) {
  const money = (cents) => formatCents(cents, currency);

  // "3 expenses in October" / "No spending in October"
  const countCaption = (count, singular, plural, none) =>
    count === 0
      ? `${none} ${period}`
      : `${count} ${count === 1 ? singular : plural} ${period}`;

  return (
    <StatGrid>
      <StatCard
        label="Net worth"
        value={money(netWorthCents)}
        description={`Across ${accountCount} account${accountCount === 1 ? "" : "s"}`}
        icon={Wallet}
      />
      <StatCard
        label={`Income ${period}`}
        value={money(thisMonth.income)}
        icon={TrendingUp}
        tone="income"
        delta={{
          value: percentChange(thisMonth.income, lastMonthToDate.income),
          goodWhen: "up",
          label: vsLabel,
        }}
        description={
          lastMonthToDate.income > 0
            ? undefined
            : countCaption(
                thisMonth.incomeCount,
                "payment",
                "payments",
                "No income",
              )
        }
      />
      <StatCard
        label={`Spent ${period}`}
        value={money(thisMonth.expense)}
        icon={TrendingDown}
        tone="expense"
        delta={{
          value: percentChange(thisMonth.expense, lastMonthToDate.expense),
          goodWhen: "down",
          label: vsLabel,
        }}
        description={
          lastMonthToDate.expense > 0
            ? undefined
            : countCaption(
                thisMonth.expenseCount,
                "expense",
                "expenses",
                "No spending",
              )
        }
      />
      <StatCard
        label={`Saved ${period}`}
        value={money(thisMonth.net)}
        icon={PiggyBank}
        tone={thisMonth.net < 0 ? "expense" : "income"}
        valueClassName={thisMonth.net < 0 ? "text-destructive" : undefined}
        description={
          thisMonth.savingsRate === null
            ? `No income ${period}`
            : `${formatPercent(thisMonth.savingsRate)} of income kept`
        }
      />
    </StatGrid>
  );
}
