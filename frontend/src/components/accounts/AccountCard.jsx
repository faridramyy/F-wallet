import { Archive, GripVertical, Pencil } from "lucide-react";

import { formatCurrency } from "../../lib/formatters";
import { ACCOUNT_TYPE_ICONS } from "../../lib/accounts";

// Theme-token color for each account type (see index.css).
const ACCOUNT_TYPE_TONES = {
  checking: "bg-chart-2/10 text-chart-2",
  savings: "bg-chart-1/10 text-chart-1",
  credit_card: "bg-chart-4/10 text-chart-4",
  cash: "bg-chart-3/10 text-chart-3",
};

// Cents (number or numeric string) -> dollars, or null if unsafe.
function centsToAmount(value) {
  const cents = Number(value ?? 0);

  return Number.isSafeInteger(cents) ? cents / 100 : null;
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
  const Icon = ACCOUNT_TYPE_ICONS[account.account_type] ?? ACCOUNT_TYPE_ICONS.cash;
  const tone = ACCOUNT_TYPE_TONES[account.account_type] ?? ACCOUNT_TYPE_TONES.cash;

  const isCreditCard = account.account_type === "credit_card";

  const openingBalance = centsToAmount(account.opening_balance_cents);
  const creditLimit = centsToAmount(account.credit_limit_cents);

  // Credit cards show what is owed, so the sign is dropped.
  const amount =
    openingBalance === null
      ? null
      : isCreditCard
        ? Math.abs(openingBalance)
        : openingBalance;

  const amountText =
    amount === null ? "Unavailable" : formatCurrency(amount, account.currency);

  const isNegative = isCreditCard ? amount > 0 : amount < 0;

  // Calculate credit utilization percentage.
  const creditUtilization =
    isCreditCard && creditLimit !== null && creditLimit > 0 && amount !== null
      ? (amount / creditLimit) * 100
      : null;

  const caption = isCreditCard
    ? `Owed${
        creditLimit > 0
          ? ` · limit ${formatCurrency(creditLimit, account.currency)}`
          : ""
      }`
    : "Opening balance";

  const details =
    [
      account.institution_name,
      account.card_last_four && `•••• ${account.card_last_four}`,
    ]
      .filter(Boolean)
      .join(" · ") || "Personal account";

  return (
    <div
      ref={containerRef}
      style={style}
      className={`group flex aspect-square flex-col justify-between rounded-xl border border-border bg-card p-3 transition-colors sm:p-4 ${
        isDragging ? "opacity-50 shadow-lg" : "hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <button
          ref={dragHandleRef}
          type="button"
          {...dragHandleProps}
          className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Reorder ${account.account_name}`}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onEdit(account)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Edit ${account.account_name}`}
          >
            <Pencil className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => onArchive(account)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Archive ${account.account_name}`}
          >
            <Archive className="size-4" />
          </button>
        </div>
      </div>

      <div
        className={`flex size-10 items-center justify-center rounded-xl sm:size-12 ${tone}`}
      >
        <Icon className="size-5 sm:size-6" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {account.account_name}
        </p>

        <p className="truncate text-xs text-muted-foreground">{details}</p>

        <p
          className={`mt-2 truncate text-lg font-semibold tabular-nums sm:text-xl ${
            isNegative ? "text-destructive" : "text-foreground"
          }`}
        >
          {amountText}
        </p>

        {/* Credit card utilization progress bar */}
        {isCreditCard && creditUtilization !== null && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="shrink-0">
                {creditUtilization.toFixed(0)}% used
              </span>

              <span className="truncate text-right">
                {formatCurrency(
                  Math.max(creditLimit - amount, 0),
                  account.currency,
                )}{" "}
                available
              </span>
            </div>

            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Credit utilization"
              aria-valuenow={Math.round(creditUtilization)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(creditUtilization, 100)}%`,
                  background:
                    creditUtilization > 100
                      ? "red"
                      : creditUtilization <= 70
                        ? "white"
                        : creditUtilization <= 90
                          ? "linear-gradient(to right, white, yellow)"
                          : "linear-gradient(to right, yellow, red)",
                }}
              />
            </div>
          </div>
        )}

        <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
          {caption}
        </p>
      </div>
    </div>
  );
}
