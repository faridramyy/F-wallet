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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Good morning
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your money.
          </p>
        </div>
      </div>

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
