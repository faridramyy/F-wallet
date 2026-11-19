import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { formatCurrency } from "../../lib/formatters";

const accountIcons = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
};

const accountLabels = {
  checking: "Checking account",
  savings: "Savings account",
  credit_card: "Credit card",
};

export function AccountCard({ account }) {
  const Icon = account.icon || accountIcons[account.account_type] || Wallet;
  const balance = Number(account.balance || 0);
  const isCreditCard = account.account_type === "credit_card";
  const creditLimit = Number(account.credit_limit_cents || 0) / 100;
  const debt = Math.max(0, -balance);

  const utilization =
    isCreditCard && creditLimit > 0
      ? Math.min((debt / creditLimit) * 100, 100)
      : 0;

  return (
    <Card className="group rounded-xl border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon size={21} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-semibold text-card-foreground">
                {account.account_name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {account.institution_name || "Personal account"}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {accountLabels[account.account_type] || account.account_type}
          </span>
        </div>

        <div className="mt-7">
          <p className="text-xs text-muted-foreground">
            {isCreditCard ? "Current balance owed" : "Available balance"}
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {balance < 0 ? "-" : ""}
            {formatCurrency(Math.abs(balance))}
          </p>
        </div>

        {isCreditCard && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Credit utilization</span>
              <span className="font-medium tabular-nums text-foreground">
                {utilization.toFixed(0)}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-2 transition-all"
                style={{ width: `${utilization}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Limit</span>
              <span className="tabular-nums">
                {creditLimit > 0 ? formatCurrency(creditLimit) : "Not set"}
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            {account.card_last_four
              ? `•••• ${account.card_last_four}`
              : account.is_archived
                ? "Archived"
                : "Active account"}
          </span>

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {balance < 0 ? (
              <>
                <ArrowDownRight size={14} />
                Liability
              </>
            ) : (
              <>
                <ArrowUpRight size={14} />
                Asset
              </>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
