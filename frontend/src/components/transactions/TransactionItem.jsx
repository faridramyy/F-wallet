import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";
import { formatCurrency } from "../../lib/formatters";

export function TransactionItem({ transaction }) {
  const positive = transaction.amount > 0;
  const Icon = transaction.icon || ShoppingBag;

  return (
    <div className="flex items-center gap-3 py-4 first:pt-1 last:pb-1">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {transaction.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {transaction.category} · {transaction.account}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-slate-800"}`}
        >
          {positive ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{transaction.date}</p>
      </div>
    </div>
  );
}
