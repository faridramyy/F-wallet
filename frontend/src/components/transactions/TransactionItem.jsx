import { Pencil, Trash2, Undo2 } from "lucide-react";
import { cn } from "cn";

import { IconButton } from "../ui/icon-button";
import { formatCents, getTransactionTitle } from "../../lib/formatters";
import { getTransactionKind } from "../../lib/transaction-kinds";

// Types the user can edit and delete (adjustments are system-made).
const MODIFIABLE_TYPES = new Set(["income", "expense", "transfer", "refund"]);

function getSubtitle(transaction) {
  if (transaction.transaction_type === "transfer") {
    return `${transaction.account_name ?? "?"} → ${transaction.to_account_name ?? "?"}`;
  }

  // Don't repeat the merchant when it is already the title.
  return (
    [
      transaction.description ? transaction.merchant : null,
      transaction.category_name,
      transaction.account_name,
    ]
      .filter(Boolean)
      .join(" · ") || "Uncategorized"
  );
}

//   onRefund: shown on expenses that are not fully refunded yet
export function TransactionItem({
  transaction,
  currency,
  onEdit,
  onDelete,
  onRefund,
}) {
  const type = transaction.transaction_type;
  const { icon: Icon, sign, text, badge } = getTransactionKind(type);

  const refundedCents = Number(transaction.refunded_cents ?? 0);
  const canRefund =
    onRefund && type === "expense" && refundedCents < transaction.amount_cents;
  const canModify = MODIFIABLE_TYPES.has(type) && (onEdit || onDelete);

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:gap-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          badge,
        )}
      >
        <Icon size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {getTransactionTitle(transaction)}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {getSubtitle(transaction)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold tabular-nums", text)}>
          {sign}
          {formatCents(transaction.amount_cents, currency)}
        </p>
        {refundedCents > 0 && (
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {formatCents(refundedCents, currency)} refunded
          </p>
        )}
      </div>

      {(canModify || canRefund) && (
        <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
          {canRefund && (
            <IconButton
              icon={Undo2}
              label="Refund"
              onClick={() => onRefund(transaction)}
            />
          )}
          {canModify && onEdit && (
            <IconButton
              icon={Pencil}
              label="Edit transaction"
              onClick={() => onEdit(transaction)}
            />
          )}
          {canModify && onDelete && (
            <IconButton
              icon={Trash2}
              tone="destructive"
              label="Delete transaction"
              onClick={() => onDelete(transaction)}
            />
          )}
        </div>
      )}
    </div>
  );
}
