import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { TransactionList } from "../components/transactions/TransactionList";

export function TransactionsPage({ transactions }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      transactions.filter((transaction) =>
        `${transaction.name} ${transaction.category} ${transaction.account}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [transactions, search],
  );

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">All transactions</CardTitle>
          <p className="mt-1 text-xs text-slate-400">
            Review your financial activity
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={16}
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <TransactionList transactions={filtered} />
      </CardContent>
    </Card>
  );
}
