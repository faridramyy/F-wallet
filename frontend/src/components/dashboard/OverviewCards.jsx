import { ArrowUpRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { formatCurrency } from "../../lib/formatters";

const overview = [
  {
    label: "Total balance",
    amount: 23440.5,
    note: "Across your accounts",
    icon: Wallet,
    iconClass: "bg-muted text-muted-foreground",
    amountClass: "text-card-foreground",
  },
  {
    label: "Monthly income",
    amount: 5250,
    note: "Income received this month",
    icon: TrendingUp,
    iconClass: "bg-chart-1/10 text-chart-1",
    amountClass: "text-chart-1",
  },
  {
    label: "Monthly expenses",
    amount: 1842.65,
    note: "Expenses recorded this month",
    icon: TrendingDown,
    iconClass: "bg-chart-5/10 text-chart-5",
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
