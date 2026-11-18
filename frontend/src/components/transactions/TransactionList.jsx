import { TransactionItem } from "./TransactionItem";

export function TransactionList({ transactions }) {
  if (!transactions.length) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        No transactions found.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {transactions.map((transaction) => (
        <TransactionItem key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
