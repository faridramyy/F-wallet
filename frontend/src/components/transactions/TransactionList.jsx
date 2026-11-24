import { Receipt } from "lucide-react";
import { cn } from "cn";

import { EmptyState } from "../ui/empty-state";
import { useAppData } from "../providers/useAppData";
import { TransactionItem } from "./TransactionItem";
import { formatCents, formatDateKey } from "../../lib/formatters";

// Net effect on the day's total, in cents. Transfers move money between your
// own accounts, so they are left out of income/expense totals.
function getSignedCents({ transaction_type: type, amount_cents }) {
  const cents = Number(amount_cents);

  if (type === "income" || type === "refund") return cents;
  if (type === "expense") return -cents;
  return 0;
}

// Groups newest-first transactions by day. Because the input is already
// sorted by date, groups come out in order without another sort.
function groupByDay(transactions) {
  const groups = [];

  for (const transaction of transactions) {
    const key = transaction.transaction_date;
    let group = groups.at(-1);

    if (group?.key !== key) {
      group = { key, transactions: [], netCents: 0 };
      groups.push(group);
    }

    group.transactions.push(transaction);
    group.netCents += getSignedCents(transaction);
  }

  return groups;
}

function netTone(cents) {
  if (cents > 0) return "text-income";
  if (cents < 0) return "text-expense";
  return "text-muted-foreground";
}

//   showDayHeaders: false when the list is already one known day
export function TransactionList({
  transactions = [],
  onEdit,
  onDelete,
  onRefund,
  showDayHeaders = true,
}) {
  const { currency } = useAppData();

  if (!transactions.length) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions found"
        description="Your transactions will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groupByDay(transactions).map((group) => (
        <section key={group.key}>
          {showDayHeaders && (
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {formatDateKey(group.key)}
              </h3>

              <p
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  netTone(group.netCents),
                )}
              >
                {group.netCents > 0 ? "+" : ""}
                {formatCents(group.netCents, currency)}
              </p>
            </div>
          )}

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
            {group.transactions.map((transaction) => (
              <TransactionItem
                key={transaction.transaction_id}
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefund={onRefund}
                currency={currency}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
