import { TransactionItem } from "./TransactionItem";
import { formatCurrency } from "../../lib/formatters";

// transaction_date is a plain "YYYY-MM-DD" string from the API. Build the Date
// from its parts in LOCAL time. new Date("2026-11-22") would be parsed as UTC
// midnight and show as Nov 21 for anyone west of UTC.
function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Net effect on the day's total, in cents. Transfers move money between your
// own accounts, so they are left out of income/expense totals.
function getSignedCents(transaction) {
  const cents = transaction.amount_cents;

  if (transaction.transaction_type === "income") return cents;
  if (transaction.transaction_type === "refund") return cents;
  if (transaction.transaction_type === "expense") return -cents;

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
      const key = transaction.transaction_date;

      if (!groups[key]) {
        groups[key] = {
          key,
          label: formatDateLabel(key),
          transactions: [],
          netCents: 0,
        };
      }

      groups[key].transactions.push(transaction);
      groups[key].netCents += getSignedCents(transaction);

      return groups;
    }, {}),
  ).sort((a, b) => b.key.localeCompare(a.key));

  return (
    <div className="space-y-6">
      {groupedTransactions.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h3>

            <p
              className={`text-xs font-semibold tabular-nums ${
                group.netCents > 0
                  ? "text-chart-1"
                  : group.netCents < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {group.netCents > 0 ? "+" : ""}
              {formatCurrency(group.netCents / 100)}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {group.transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.transaction_id}
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
