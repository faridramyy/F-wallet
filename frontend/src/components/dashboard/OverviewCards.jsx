import { ArrowUpRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { formatCurrency } from "../../lib/formatters";

const overview = [
  {
    label: "Total balance",
    amount: 23440.5,
    note: "Across your accounts",
    icon: Wallet,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amountClass: "text-card-foreground",
  },
  {
    label: "Monthly income",
    amount: 5250,
    note: "Income received this month",
    icon: TrendingUp,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amountClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Monthly expenses",
    amount: 1842.65,
    note: "Expenses recorded this month",
    icon: TrendingDown,
    iconClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    amountClass: "text-card-foreground",
  },
];

export function OverviewCards() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {overview.map(
        ({ label, amount, note, icon: Icon, iconClass, amountClass }) => (
          <Card
            key={label}
            className="rounded-2xl border-border bg-card text-card-foreground shadow-sm"
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
                {formatCurrency(amount)}
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
