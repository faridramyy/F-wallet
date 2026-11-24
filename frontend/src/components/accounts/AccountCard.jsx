import { Archive, GripVertical, Pencil } from "lucide-react";
import { cn } from "cn";

import { IconButton } from "../ui/icon-button";
import { formatCurrency } from "../../lib/formatters";
import { getAccountBalance, getAccountType } from "../../lib/accounts";

// Bar color for a credit card's utilization percentage.
function utilizationTone(percent) {
  if (percent > 90) return "bg-destructive";
  if (percent > 70) return "bg-warning";
  return "bg-income";
}

function CreditUtilization({ owed, limit, currency }) {
  const percent = (owed / limit) * 100;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
        <span className="shrink-0">{percent.toFixed(0)}% used</span>
        <span className="truncate text-right">
          {formatCurrency(Math.max(limit - owed, 0), currency)} available
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Credit utilization"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            utilizationTone(percent),
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function AccountCard({
  account,
  onEdit,
  onArchive,
  dragHandleProps,
  dragHandleRef,
  containerRef,
  style,
  isDragging = false,
}) {
  const { icon: Icon, tone } = getAccountType(account.account_type);
  const { amount, isNegative } = getAccountBalance(account);

  const isCreditCard = account.account_type === "credit_card";
  const creditLimit = Number(account.credit_limit_cents ?? 0) / 100;
  const hasLimit = isCreditCard && creditLimit > 0;

  const details =
    [
      account.institution_name,
      account.card_last_four && `•••• ${account.card_last_four}`,
    ]
      .filter(Boolean)
      .join(" · ") || "Personal account";

  const caption = isCreditCard
    ? `Owed${hasLimit ? ` · limit ${formatCurrency(creditLimit, account.currency)}` : ""}`
    : "Opening balance";

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "group flex aspect-square flex-col justify-between rounded-xl border border-border bg-card p-3 text-card-foreground transition-colors sm:p-4",
        isDragging ? "opacity-50 shadow-lg" : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between">
        <IconButton
          ref={dragHandleRef}
          {...dragHandleProps}
          icon={GripVertical}
          label={`Reorder ${account.account_name}`}
          className="cursor-grab touch-none active:cursor-grabbing"
        />

        <div className="flex items-center">
          <IconButton
            icon={Pencil}
            label={`Edit ${account.account_name}`}
            onClick={() => onEdit(account)}
          />
          <IconButton
            icon={Archive}
            tone="destructive"
            label={`Archive ${account.account_name}`}
            onClick={() => onArchive(account)}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-xl sm:size-12",
          tone,
        )}
      >
        <Icon className="size-5 sm:size-6" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{account.account_name}</p>
        <p className="truncate text-xs text-muted-foreground">{details}</p>

        <p
          className={cn(
            "mt-2 truncate text-lg font-semibold tabular-nums sm:text-xl",
            isNegative && "text-destructive",
          )}
        >
          {formatCurrency(amount, account.currency)}
        </p>

        {hasLimit && (
          <CreditUtilization
            owed={amount}
            limit={creditLimit}
            currency={account.currency}
          />
        )}

        <p className="hidden truncate text-2xs text-muted-foreground sm:block">
          {caption}
        </p>
      </div>
    </div>
  );
}
