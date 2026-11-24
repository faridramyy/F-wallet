import { Archive, GripVertical, Pencil } from "lucide-react";
import { cn } from "cn";

import { IconButton } from "../ui/icon-button";
import { UsageBar } from "../ui/usage-bar";
import { formatCurrency } from "../../lib/formatters";
import { getAccountBalance, getAccountType } from "../../lib/accounts";

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
    : "Current balance";

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
          <UsageBar
            className="mt-2"
            used={amount}
            limit={creditLimit}
            currency={account.currency}
            label="Credit utilization"
          />
        )}

        <p className="hidden truncate text-2xs text-muted-foreground sm:block">
          {caption}
        </p>
      </div>
    </div>
  );
}
