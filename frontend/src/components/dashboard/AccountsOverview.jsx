import { ArrowUpRight, CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useAppData } from "../providers/useAppData";
import { formatCurrency } from "../../lib/formatters";

const ACCOUNT_TYPES = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Wallet,
};

const ACCOUNT_TYPE_LABELS = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  cash: "Cash",
};

export function AccountsOverview({ onViewAll }) {
  const { accounts, settings } = useAppData();
  const currency = settings?.currency ?? "CAD";

  return (
    <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">My accounts</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Your financial accounts
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg text-primary"
          onClick={onViewAll}
        >
          View all <ArrowUpRight size={14} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-1">
        {accounts.map((account, index) => {
          const Icon = ACCOUNT_TYPES[account.account_type] ?? CreditCard;
          const isCreditCard = account.account_type === "credit_card";
          const balance = Number(account.opening_balance_cents ?? 0) / 100;
          const displayBalance = isCreditCard ? Math.abs(balance) : balance;
          const isNegative = isCreditCard ? balance > 0 : balance < 0;
          const typeLabel =
            ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type;

          return (
            <div
              key={account.account_id ?? `${account.account_name}-${index}`}
              className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">
                  {account.account_name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[account.institution_name, typeLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <p
                className={`text-sm font-semibold tabular-nums ${
                  isNegative ? "text-destructive" : "text-card-foreground"
                }`}
              >
                {isNegative ? "-" : ""}
                {formatCurrency(Math.abs(displayBalance), account.currency ?? currency)}
              </p>
            </div>
          );
        })}

        {accounts.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No accounts yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
