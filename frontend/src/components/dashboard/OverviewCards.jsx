import { ArrowUpRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { formatCurrency, getCurrentYearMonth } from "../../lib/formatters";
import { useAppData } from "../providers/useAppData";

export function OverviewCards() {
  const { accounts, settings, transactions } = useAppData();
  const currency = settings?.currency ?? "CAD";

  const { prefix: thisMonth } = getCurrentYearMonth();

  const totalBalance = accounts
    .filter((a) => a.include_in_net_worth)
    .reduce((sum, a) => sum + Number(a.opening_balance_cents ?? 0) / 100, 0);

  const thisMonthTransactions = transactions.filter((t) =>
    t.transaction_date?.startsWith(thisMonth),
  );

  const monthlyIncome = thisMonthTransactions
    .filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount_cents ?? 0) / 100, 0);

  const monthlyExpenses = thisMonthTransactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount_cents ?? 0) / 100, 0);

  const overview = [
    {
      label: "Total balance",
      amount: totalBalance,
      note: "Across your accounts",
      icon: Wallet,
      iconClass: "bg-muted text-muted-foreground",
      amountClass: "text-card-foreground",
    },
    {
      label: "Monthly income",
      amount: monthlyIncome,
      note: "Income received this month",
      icon: TrendingUp,
      iconClass: "bg-chart-1/10 text-chart-1",
      amountClass: "text-chart-1",
    },
    {
      label: "Monthly expenses",
      amount: monthlyExpenses,
      note: "Expenses recorded this month",
      icon: TrendingDown,
      iconClass: "bg-chart-5/10 text-chart-5",
      amountClass: "text-card-foreground",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {overview.map(
        ({ label, amount, note, icon: Icon, iconClass, amountClass }) => (
          <Card
            key={label}
            className="rounded-xl border-border bg-card text-card-foreground shadow-sm"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>

                <div className={`rounded-lg p-2 ${iconClass}`}>
                  <Icon size={18} />
                </div>
              </div>

              <p
                className={`mt-4 text-2xl font-bold tracking-tight ${amountClass}`}
              >
                {formatCurrency(amount, currency)}
              </p>

              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {label === "Total balance" && <ArrowUpRight size={14} />}
                {note}
              </p>
            </CardContent>
          </Card>
        ),
      )}
    </section>
  );
}
