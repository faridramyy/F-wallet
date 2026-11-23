import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { TransactionList } from "../components/transactions/TransactionList";
import { useNotifications } from "../components/providers/useNotifications";
import { getTransactionTitle } from "../lib/formatters";

export function TransactionsPage({
  transactions,
  loading,
  loadingMore,
  hasMore,
  error,
  onRetry,
  onLoadMore,
  onEdit,
  onDelete,
}) {
  const { toast, confirm } = useNotifications();
  const [search, setSearch] = useState("");

  // Note: this only searches the transactions already loaded (50 per page).
  // Searching the whole history would need a `search` query param on the API.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return transactions;

    return transactions.filter((transaction) =>
      [
        transaction.description,
        transaction.merchant,
        transaction.category_name,
        transaction.account_name,
        transaction.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [transactions, search]);

  async function handleDelete(transaction) {
    const confirmed = await confirm({
      title: "Delete transaction?",
      description: `Are you sure you want to delete "${getTransactionTitle(transaction)}"? It will no longer appear in your transactions.`,
      confirmText: "Delete transaction",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await onDelete(transaction.transaction_id);
      toast.success("Transaction deleted.");
    } catch (err) {
      toast.error(err.message || "Unable to delete transaction.");
    }
  }

  async function handleLoadMore() {
    try {
      await onLoadMore();
    } catch (err) {
      toast.error(err.message || "Unable to load more transactions.");
    }
  }

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
            aria-label="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            className="rounded-lg border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading transactions...
          </p>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>

            <Button variant="outline" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <TransactionList
              transactions={filtered}
              onEdit={onEdit}
              onDelete={handleDelete}
            />

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
