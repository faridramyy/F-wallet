import { useState } from "react";

import { Button } from "../components/ui/button";
import { SectionCard } from "../components/common/SectionCard";
import { TransactionFilters } from "../components/transactions/TransactionFilters";
import { TransactionList } from "../components/transactions/TransactionList";
import { RefundDialog } from "../components/transactions/RefundDialog";
import { useNotifications } from "../components/providers/useNotifications";
import { useAppData } from "../components/providers/useAppData";
import { formatDateKey, getTransactionTitle } from "../lib/formatters";
import {
  EMPTY_FILTERS,
  filterTransactions,
  hasActiveFilters,
} from "../lib/transaction-filters";

export function TransactionsPage({ onEdit }) {
  const { toast, confirm } = useNotifications();
  const {
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loadMoreTransactions,
    deleteTransaction,
    createRefund,
    updateRefund,
    accounts,
    categories,
  } = useAppData();

  // null = closed; { expense } = new refund; { expense?, refund } = editing
  const [refundDialog, setRefundDialog] = useState(null);

  const findTransaction = (id) =>
    transactions.find((item) => item.transaction_id === id);

  // Refunds open the refund form; everything else the transaction form.
  function handleEdit(transaction) {
    if (transaction.transaction_type === "refund") {
      setRefundDialog({
        refund: transaction,
        expense: findTransaction(transaction.original_transaction_id),
      });
    } else {
      onEdit(transaction);
    }
  }

  const handleSaveRefund = (body) =>
    refundDialog.refund
      ? updateRefund(refundDialog.refund.transaction_id, body)
      : createRefund(refundDialog.expense.transaction_id, body);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Filters run over the loaded history (the last 17 months at sign-in,
  // plus anything paged in with "Load more").
  const filtered = filterTransactions(transactions, filters, categories);
  const isFiltering = hasActiveFilters(filters);
  const oldestLoaded = transactions.at(-1)?.transaction_date;

  const countLabel = `${filtered.length.toLocaleString("en-CA")} ${
    filtered.length === 1 ? "transaction" : "transactions"
  }`;

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
      <TransactionFilters
        filters={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
      />

      <SectionCard
        title={isFiltering ? "Matching transactions" : "All transactions"}
        description={
          isFiltering
            ? countLabel
            : `${countLabel} · Review your financial activity`
        }
      >
        {isFiltering && filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No transactions match these filters.
          </p>
        ) : (
          <TransactionList
            transactions={filtered}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefund={(expense) => setRefundDialog({ expense })}
          />
        )}

        {hasMoreTransactions && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {isFiltering && oldestLoaded && (
              <p className="text-xs text-muted-foreground">
                Searching back to {formatDateKey(oldestLoaded)}. Load more to
                include older transactions.
              </p>
            )}
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

      <RefundDialog
        open={refundDialog !== null}
        expense={refundDialog?.expense}
        refund={refundDialog?.refund}
        accounts={accounts}
        onClose={() => setRefundDialog(null)}
        onSave={handleSaveRefund}
      />
    </div>
  );
}
