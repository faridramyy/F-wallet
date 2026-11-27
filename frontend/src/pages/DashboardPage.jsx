import { useState } from "react";

import { OverviewCards } from "../components/dashboard/OverviewCards";
import { InsightsCard } from "../components/dashboard/InsightsCard";
import { TransactionCalendar } from "../components/dashboard/TransactionCalendar";
import { AccountsOverview } from "../components/dashboard/AccountsOverview";
import { BudgetOverview } from "../components/dashboard/BudgetOverview";
import { RecentTransactions } from "../components/dashboard/RecentTransactions";
import { CashFlowChart } from "../components/charts/CashFlowChart";
import { SpendingPaceChart } from "../components/charts/SpendingPaceChart";
import { CategorySpendingChart } from "../components/charts/CategorySpendingChart";
import { MonthSwitcher } from "../components/common/MonthSwitcher";
import { useAppData } from "../components/providers/useAppData";
import {
  CASH_FLOW_MONTHS,
  FUTURE_MONTHS,
  SELECTABLE_MONTHS,
  cumulativeDailySpending,
  getMonthContext,
  getSelectedMonthContext,
  largestExpense,
  lastMonths,
  monthlyCashFlow,
  shiftMonth,
  spendingByCategory,
  summarizeMonth,
  topMerchant,
} from "../lib/analytics";
import { formatMonthName, formatMonthYear } from "../lib/formatters";
import { summarizeAccounts } from "../lib/accounts";

const nameOf = ({ year, month }) => formatMonthName(year, month);

export function DashboardPage() {
  const { accounts, currency, transactions } = useAppData();

  // The month every section below describes; defaults to the current one.
  // From SELECTABLE_MONTHS back to FUTURE_MONTHS ahead.
  const thisMonthNow = getMonthContext().current;
  const earliest = shiftMonth(
    thisMonthNow.year,
    thisMonthNow.month,
    1 - SELECTABLE_MONTHS,
  );
  const furthest = shiftMonth(
    thisMonthNow.year,
    thisMonthNow.month,
    FUTURE_MONTHS,
  );
  const [selected, setSelected] = useState(thisMonthNow);

  const { current, previous, today, days, isCurrent } = getSelectedMonthContext(
    selected.year,
    selected.month,
  );

  // Wording that follows the chosen month.
  const period = isCurrent ? "this month" : `in ${nameOf(current)}`;
  const vsLabel = isCurrent ? "vs last month" : `vs ${nameOf(previous)}`;
  const monthLabel = formatMonthYear(current.year, current.month);

  // Every figure below is derived from the same loaded data, so the cards
  // and charts always agree.
  const thisMonth = summarizeMonth(transactions, current.key);
  const lastMonthToDate = summarizeMonth(transactions, previous.key, today);
  const categories = spendingByCategory(transactions, current.key);

  const netWorthCents = summarizeAccounts(accounts).netCents;

  // The pace chart stops at today for the current month.
  const currentPace = cumulativeDailySpending(
    transactions,
    current.year,
    current.month,
  ).slice(0, today);
  const previousPace = cumulativeDailySpending(
    transactions,
    previous.year,
    previous.month,
  );

  return (
    <div className="space-y-6">
      <MonthSwitcher
        value={current}
        min={earliest}
        max={furthest}
        today={thisMonthNow}
        onChange={(offset) =>
          setSelected(shiftMonth(current.year, current.month, offset))
        }
        onReset={() => setSelected(thisMonthNow)}
      />

      <OverviewCards
        netWorthCents={netWorthCents}
        accountCount={accounts.length}
        thisMonth={thisMonth}
        lastMonthToDate={lastMonthToDate}
        period={period}
        vsLabel={vsLabel}
        currency={currency}
      />

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CashFlowChart
            months={monthlyCashFlow(
              transactions,
              lastMonths(
                CASH_FLOW_MONTHS,
                new Date(current.year, current.month - 1, 1),
              ),
            )}
            currency={currency}
          />
        </div>
        <InsightsCard
          title={
            isCurrent ? "This month at a glance" : `${monthLabel} at a glance`
          }
          isCurrent={isCurrent}
          thisMonth={thisMonth}
          today={today}
          daysInMonth={days}
          topCategory={categories.find((item) => item.id !== "other")}
          largest={largestExpense(transactions, current.key)}
          merchant={topMerchant(transactions, current.key)}
          currency={currency}
        />
      </section>

      {/* Keyed by month, so the selected day resets when the month changes. */}
      <TransactionCalendar
        key={current.key}
        year={current.year}
        month={current.month}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <SpendingPaceChart
          current={currentPace}
          previous={previousPace}
          currentLabel={monthLabel}
          previousLabel={formatMonthYear(previous.year, previous.month)}
          currency={currency}
        />
        <CategorySpendingChart
          items={categories}
          monthLabel={monthLabel}
          currency={currency}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AccountsOverview />
        <BudgetOverview year={current.year} month={current.month} />
      </section>

      <RecentTransactions />
    </div>
  );
}
