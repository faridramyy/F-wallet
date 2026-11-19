import { OverviewCards } from "../components/dashboard/OverviewCards";
import { AccountsOverview } from "../components/dashboard/AccountsOverview";
import { BudgetOverview } from "../components/dashboard/BudgetOverview";
import { RecentTransactions } from "../components/dashboard/RecentTransactions";

export function DashboardPage({
  transactions,
  onViewTransactions,
  onViewAccounts,
  onViewBudgets,
}) {
  return (
    <div className="space-y-7">
      <OverviewCards />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AccountsOverview onViewAll={onViewAccounts} />
        <BudgetOverview onManage={onViewBudgets} />
      </section>

      <RecentTransactions
        transactions={transactions}
        onViewAll={onViewTransactions}
      />
    </div>
  );
}
