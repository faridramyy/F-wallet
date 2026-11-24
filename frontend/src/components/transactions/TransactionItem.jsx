import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "cn";

import { IconButton } from "../ui/icon-button";
import { formatCents, getTransactionTitle } from "../../lib/formatters";

// Icon, color and sign for each kind of transaction.
const KINDS = {
  income: { icon: ArrowDownLeft, tone: "income", sign: "+" },
  expense: { icon: ArrowUpRight, tone: "expense", sign: "-" },
  transfer: { icon: ArrowLeftRight, tone: "transfer", sign: "" },
};

const TONES = {
  income: { text: "text-income", badge: "bg-income/10 text-income" },
  expense: { text: "text-expense", badge: "bg-expense/10 text-expense" },
  transfer: { text: "text-transfer", badge: "bg-transfer/10 text-transfer" },
};

function getKind(type) {
  if (type === "income" || type === "refund") return KINDS.income;
  if (type === "transfer") return KINDS.transfer;
  return KINDS.expense;
}

// The API only lets income and expense be edited or deleted for now.
const EDITABLE_TYPES = new Set(["income", "expense"]);

export function TransactionItem({ transaction, onEdit, onDelete }) {
  const { icon: Icon, tone, sign } = getKind(transaction.transaction_type);
  const canModify =
    EDITABLE_TYPES.has(transaction.transaction_type) && (onEdit || onDelete);

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
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          TONES[tone].badge,
        )}
      >
        <Icon size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {getTransactionTitle(transaction)}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {subtitle || "Uncategorized"}
        </p>
      </div>

      <p
        className={cn(
          "shrink-0 text-right text-sm font-semibold tabular-nums",
          TONES[tone].text,
        )}
      >
        {sign}
        {formatCents(transaction.amount_cents)}
      </p>

      {canModify && (
        <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
          {onEdit && (
            <IconButton
              icon={Pencil}
              label="Edit transaction"
              onClick={() => onEdit(transaction)}
            />
          )}
          {onDelete && (
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
