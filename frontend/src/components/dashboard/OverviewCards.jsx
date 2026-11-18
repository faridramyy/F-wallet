import { ArrowUpRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { formatCurrency } from "../../lib/formatters";

const overview = [
  {
    label: "Total balance",
    amount: 23440.5,
    note: "Across your accounts",
    icon: Wallet,
    iconClass: "bg-blue-50 text-blue-700",
    amountClass: "text-slate-900",
  },
  {
    label: "Monthly income",
    amount: 5250,
    note: "Income received this month",
    icon: TrendingUp,
    iconClass: "bg-emerald-50 text-emerald-700",
    amountClass: "text-emerald-600",
  },
  {
    label: "Monthly expenses",
    amount: 1842.65,
    note: "Expenses recorded this month",
    icon: TrendingDown,
    iconClass: "bg-red-50 text-red-600",
    amountClass: "text-slate-900",
  },
];

export function OverviewCards() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {overview.map(
        ({ label, amount, note, icon: Icon, iconClass, amountClass }) => (
          <Card key={label} className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{label}</p>
                <div className={`rounded-lg p-2 ${iconClass}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p
                className={`mt-4 text-2xl font-bold tracking-tight ${amountClass}`}
              >
                {formatCurrency(amount)}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
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
