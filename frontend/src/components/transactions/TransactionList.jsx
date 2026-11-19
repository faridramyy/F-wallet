import { TransactionItem } from "./TransactionItem";

export function TransactionList({ transactions }) {
  if (!transactions.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No transactions found.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map((transaction) => (
        <TransactionItem key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
