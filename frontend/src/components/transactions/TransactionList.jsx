import { TransactionItem } from "./TransactionItem";
import { formatCurrency } from "../../lib/formatters";

function getTransactionDate(transaction) {
  const date = transaction.date;

  if (!date) return "Undated";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }

  return parsed.toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateKey(transaction) {
  if (!transaction.date) return "undated";

  const parsed = new Date(transaction.date);

  if (Number.isNaN(parsed.getTime())) {
    return String(transaction.date);
  }

  return parsed.toISOString().slice(0, 10);
}

function getSignedAmount(transaction) {
  const amount = Math.abs(transaction.amount || 0);
  const type =
    transaction.type || (transaction.amount > 0 ? "income" : "expense");

  if (type === "income") return amount;
  if (type === "expense") return -amount;

  // Transfers are excluded from daily income/expense totals.
  return 0;
}

export function TransactionList({ transactions = [], onEdit, onDelete }) {
  if (!transactions.length) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center">
        <p className="text-sm font-medium text-card-foreground">
          No transactions found
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your transactions will appear here.
        </p>
      </div>
    );
  }

  const groupedTransactions = Object.values(
    transactions.reduce((groups, transaction) => {
      const key = getDateKey(transaction);

      if (!groups[key]) {
        groups[key] = {
          key,
          date: getTransactionDate(transaction),
          transactions: [],
          netTotal: 0,
        };
      }

      groups[key].transactions.push(transaction);
      groups[key].netTotal += getSignedAmount(transaction);

      return groups;
    }, {}),
  ).sort((a, b) => {
    if (a.key === "undated") return 1;
    if (b.key === "undated") return -1;
    return b.key.localeCompare(a.key);
  });

  return (
    <div className="space-y-6">
      {groupedTransactions.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.date}
            </h3>

            <p
              className={`text-xs font-semibold tabular-nums ${
                group.netTotal > 0
                  ? "text-chart-1"
                  : group.netTotal < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {group.netTotal > 0 ? "+" : ""}
              {formatCurrency(group.netTotal)}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {group.transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
