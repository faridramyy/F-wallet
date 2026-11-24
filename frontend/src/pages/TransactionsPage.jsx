import { useState } from "react";
import {
  ArrowLeftRight,
  Search,
  TrendingDown,
  TrendingUp,
  Scale,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatCard, StatGrid } from "../components/ui/stat-card";
import { SectionCard } from "../components/common/SectionCard";
import { TransactionList } from "../components/transactions/TransactionList";
import { useNotifications } from "../components/providers/useNotifications";
import { useAppData } from "../components/providers/useAppData";
import {
  formatCents,
  formatPercent,
  getTransactionTitle,
} from "../lib/formatters";
import { summarize } from "../lib/analytics";

const SEARCH_FIELDS = [
  "description",
  "merchant",
  "category_name",
  "account_name",
  "notes",
];

const matches = (transaction, term) =>
  SEARCH_FIELDS.some((field) =>
    transaction[field]?.toLowerCase().includes(term),
  );

export function TransactionsPage({ onEdit }) {
  const { toast, confirm } = useNotifications();
  const {
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loadMoreTransactions,
    deleteTransaction,
    settings,
  } = useAppData();
  const currency = settings?.currency ?? "CAD";

  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();

  // Note: this only searches the transactions already loaded (50 per page).
  // Searching the whole history would need a `search` query param on the API.
  const filtered = term
    ? transactions.filter((transaction) => matches(transaction, term))
    : transactions;

  // The cards describe exactly the rows below, including the search filter.
  const totals = summarize(filtered);
  const scope = term
    ? "Matching your search"
    : hasMoreTransactions
      ? "Loaded so far"
      : "All time";

  async function handleDelete(transaction) {
    const confirmed = await confirm({
      title: "Delete transaction?",
      description: `Are you sure you want to delete "${getTransactionTitle(transaction)}"? It will no longer appear in your transactions.`,
      confirmText: "Delete transaction",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await deleteTransaction(transaction.transaction_id);
      toast.success("Transaction deleted.");
    } catch (err) {
      toast.error(err.message || "Unable to delete transaction.");
    }
  }

  async function handleLoadMore() {
    try {
      await loadMoreTransactions();
    } catch (err) {
      toast.error(err.message || "Unable to load more transactions.");
    }
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard
          label="Transactions"
          value={filtered.length.toLocaleString("en-CA")}
          description={scope}
          icon={ArrowLeftRight}
        />
        <StatCard
          label="Income"
          value={formatCents(totals.income, currency)}
          description={scope}
          icon={TrendingUp}
          tone="income"
        />
        <StatCard
          label="Expenses"
          value={formatCents(totals.expense, currency)}
          description={scope}
          icon={TrendingDown}
          tone="expense"
        />
        <StatCard
          label="Net"
          value={formatCents(totals.net, currency)}
          valueClassName={totals.net < 0 ? "text-destructive" : undefined}
          description={
            totals.savingsRate === null
              ? scope
              : `${formatPercent(totals.savingsRate)} of income kept`
          }
          icon={Scale}
        />
      </StatGrid>

      <SectionCard
        title="All transactions"
        description="Review your financial activity"
        action={
          <div className="relative w-44 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search transactions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions..."
              className="pl-9"
            />
          </div>
        }
      >
        <TransactionList
          transactions={filtered}
          onEdit={onEdit}
          onDelete={handleDelete}
        />

        {hasMoreTransactions && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMoreTransactions}
            >
              {loadingMoreTransactions ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
