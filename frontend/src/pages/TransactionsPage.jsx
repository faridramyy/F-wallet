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
    <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm transition-colors duration-200">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base text-card-foreground">
            All transactions
          </CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Review your financial activity
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-2.5 text-muted-foreground"
            size={16}
          />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            className="rounded-lg border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </CardHeader>

      <CardContent>
        <TransactionList transactions={filtered} />
      </CardContent>
    </Card>
  );
}
