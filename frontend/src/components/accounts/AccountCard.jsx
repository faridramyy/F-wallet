import {
  CreditCard,
  GripVertical,
  Landmark,
  Pencil,
  PiggyBank,
  Trash2,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { formatCurrency } from "../../lib/formatters";

const accountIcons = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Wallet,
};

export function AccountCard({
  account,
  onEdit,
  onDelete,
  isDragging = false,
  isOverlay = false,
  dragHandleProps = {},
}) {
  const Icon = accountIcons[account.account_type] || Wallet;

  const openingBalanceCents = Number(account.opening_balance_cents ?? 0);
  const openingBalance = Number.isSafeInteger(openingBalanceCents)
    ? openingBalanceCents / 100
    : null;

  const creditLimitCents = Number(account.credit_limit_cents ?? 0);
  const creditLimit = Number.isSafeInteger(creditLimitCents)
    ? creditLimitCents / 100
    : null;

  return (
    <Card
      className={`rounded-xl border-border bg-card shadow-sm transition-[box-shadow,border-color] duration-200 ${
        isDragging && !isOverlay
          ? "pointer-events-none opacity-0"
          : isOverlay
            ? "border-primary/40 shadow-2xl ring-2 ring-primary/10"
            : "hover:border-primary/20 hover:shadow-md"
      }`}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            {...dragHandleProps}
            title="Drag to reorder account"
            aria-label={`Drag to reorder ${account.account_name}`}
            className="flex size-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical size={19} />
          </button>

          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon size={21} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-card-foreground">
              {account.account_name}
            </h3>

            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {account.institution_name || "Personal account"}
            </p>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-xs text-muted-foreground">Opening balance</p>

          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {openingBalance === null
              ? "Unavailable"
              : formatCurrency(openingBalance, account.currency)}
          </p>
        </div>

        {account.account_type === "credit_card" && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Credit limit</span>

              <span className="font-medium tabular-nums text-foreground">
                {creditLimit === null
                  ? "Unavailable"
                  : creditLimit > 0
                    ? formatCurrency(creditLimit, account.currency)
                    : "Not set"}
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            {account.card_last_four
              ? `•••• ${account.card_last_four}`
              : "Active account"}
          </span>

          <span className="text-xs text-muted-foreground">
            {account.include_in_net_worth
              ? "Included in net worth"
              : "Excluded from net worth"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onEdit(account)}
            title="Edit account"
            aria-label={`Edit ${account.account_name}`}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(account)}
            title="Archive account"
            aria-label={`Archive ${account.account_name}`}
            className="flex size-9 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
