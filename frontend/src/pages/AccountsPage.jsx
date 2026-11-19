import { CreditCard, Landmark, PiggyBank } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { accounts } from "../data/mockData";
import { formatCurrency } from "../lib/formatters";

const accountIcons = {
  Checking: Landmark,
  Savings: PiggyBank,
  "Credit card": CreditCard,
};

export function AccountsPage() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => {
        const Icon = accountIcons[account.type] || CreditCard;

        return (
          <Card
            key={account.name}
            className="rounded-xl border-border bg-card text-card-foreground shadow-sm transition-colors duration-200"
          >
            <CardContent className="p-6">
              <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon size={22} strokeWidth={1.8} />
              </div>

              <p className="font-semibold text-card-foreground">
                {account.name}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {account.institution} · {account.type}
              </p>

              <p className="mt-5 text-2xl font-bold tabular-nums text-foreground">
                {account.balance < 0 ? "-" : ""}
                {formatCurrency(Math.abs(account.balance))}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
