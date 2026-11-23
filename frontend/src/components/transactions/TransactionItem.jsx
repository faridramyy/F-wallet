import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "../../lib/formatters";

// The API only lets income and expense be edited or deleted for now.
const EDITABLE_TYPES = ["income", "expense"];

export function TransactionItem({ transaction, onEdit, onDelete }) {
  const type = transaction.transaction_type;

  const isIncome = type === "income" || type === "refund";
  const isTransfer = type === "transfer";
  const canModify = EDITABLE_TYPES.includes(type);

  const Icon = isTransfer
    ? ArrowLeftRight
    : isIncome
      ? ArrowDownLeft
      : ArrowUpRight;

  const amountColor = isTransfer
    ? "text-chart-2"
    : isIncome
      ? "text-chart-1"
      : "text-destructive";

  const iconColor = isTransfer
    ? "bg-chart-2/10 text-chart-2"
    : isIncome
      ? "bg-chart-1/10 text-chart-1"
      : "bg-destructive/10 text-destructive";

  const title =
    transaction.description ||
    transaction.merchant ||
    transaction.category_name ||
    "Transaction";

  // Don't repeat the merchant when it is already the title.
  const subtitle = [
    transaction.description ? transaction.merchant : null,
    transaction.category_name,
    transaction.account_name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:gap-4">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconColor}`}
      >
        <Icon size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">
          {title}
        </p>

        <p className="mt-1 truncate text-xs text-muted-foreground">
          {subtitle || "Uncategorized"}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold tabular-nums ${amountColor}`}>
          {isIncome ? "+" : isTransfer ? "" : "-"}
          {formatCurrency(transaction.amount_cents / 100)}
        </p>
      </div>

      {canModify && (onEdit || onDelete) && (
        <>
          <div className="mx-1 h-8 w-px shrink-0 bg-border" />

          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(transaction)}
                aria-label="Edit transaction"
                title="Edit transaction"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil size={16} strokeWidth={1.8} />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(transaction)}
                aria-label="Delete transaction"
                title="Delete transaction"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={16} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
