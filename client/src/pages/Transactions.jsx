import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Panel, EmptyState, ConfirmModal, Field } from "../components/ui";
import { describePay } from "../lib/calc";
import { money, formatDate, formatHours, fold } from "../lib/format";
import TransactionModal from "../modals/TransactionModal";
import TransferModal from "../modals/TransferModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const dangerIconButton =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";

export default function Transactions({ onEdit }) {
  const {
    accounts,
    categories,
    transactions,
    currency,
    deleteTransaction,
    getAccountName,
    getCategoryName,
  } = useApp();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const fmt = (value) => money(value, { currency });

  const filtered = useMemo(() => {
    const term = fold(search.trim());

    return transactions
      .filter((transaction) => {
        if (typeFilter !== "all" && transaction.type !== typeFilter)
          return false;

        if (accountFilter !== "all") {
          const matches =
            transaction.accountId === accountFilter ||
            transaction.fromAccountId === accountFilter ||
            transaction.toAccountId === accountFilter;

          if (!matches) return false;
        }

        if (
          categoryFilter !== "all" &&
          transaction.categoryId !== categoryFilter
        )
          return false;

        /*
          Dates are stored as YYYY-MM-DD strings, which sort and compare
          correctly as plain text. No Date parsing needed, and no timezone
          to get wrong.
        */
        if (fromDate && String(transaction.date) < fromDate) return false;
        if (toDate && String(transaction.date) > toDate) return false;

        if (term) {
          const haystack = [
            transaction.notes,
            getCategoryName(transaction.categoryId),
            getAccountName(transaction.accountId),
            getAccountName(transaction.fromAccountId),
            getAccountName(transaction.toAccountId),
            String(transaction.amount),
          ];

          if (!fold(haystack.join(" ")).includes(term)) return false;
        }

        return true;
      })
      .sort((a, b) =>
        a.date === b.date
          ? (b.createdAt || "").localeCompare(a.createdAt || "")
          : b.date.localeCompare(a.date),
      );
  }, [
    transactions,
    search,
    typeFilter,
    accountFilter,
    categoryFilter,
    fromDate,
    toDate,
    getAccountName,
    getCategoryName,
  ]);

  /*
    The list is already sorted newest first, so grouping is just a walk:
    start a new group whenever the date changes. Each group carries its
    own net total for the day.
  */

  const days = useMemo(() => {
    const groups = [];

    for (const transaction of filtered) {
      let group = groups[groups.length - 1];

      if (!group || group.date !== transaction.date) {
        group = { date: transaction.date, items: [], net: 0 };
        groups.push(group);
      }

      group.items.push(transaction);

      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "income") group.net += amount;
      if (transaction.type === "expense") group.net -= amount;
    }

    return groups;
  }, [filtered]);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setAccountFilter("all");
    setCategoryFilter("all");
    setFromDate("");
    setToDate("");
  };

  const filtersActive =
    search ||
    typeFilter !== "all" ||
    accountFilter !== "all" ||
    categoryFilter !== "all" ||
    fromDate ||
    toDate;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {transactions.length} shown
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTransfer(true)}
            disabled={accounts.length < 2}
          >
            <i className="fa-solid fa-right-left" />
            Transfer
          </Button>

          <Button type="button" onClick={() => setShowModal(true)}>
            <i className="fa-solid fa-plus" />
            Add
          </Button>
        </div>
      </div>

      <Panel>
        <div className="mb-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search" className="sm:col-span-2">
            <Input
              type="search"
              placeholder="Notes, category, account or amount"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>

          <Field label="Type">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Account">
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Category">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="From">
            <Input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </Field>

          <Field label="To">
            <Input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
            />
          </Field>
        </div>

        {filtersActive && (
          <Button
            type="button"
            variant="outline"
            className="mb-4"
            onClick={resetFilters}
          >
            <i className="fa-solid fa-filter-circle-xmark" />
            Clear filters
          </Button>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon="fa-receipt"
            title={
              transactions.length === 0
                ? "No transactions yet"
                : "Nothing matches those filters"
            }
            message={
              transactions.length === 0
                ? "Add your first transaction to start tracking."
                : "Try widening your search or clearing the filters."
            }
            action={
              transactions.length === 0 ? (
                <Button type="button" onClick={() => setShowModal(true)}>
                  Add a transaction
                </Button>
              ) : null
            }
          />
        ) : (
          <div>
            {days.map((day) => (
              <div key={day.date} className="mb-1 mt-5 first:mt-0">
                <div className="flex items-baseline justify-between gap-3 border-b border-border px-0.5 pb-1.5">
                  <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    {formatDate(day.date)}
                  </span>

                  {day.net !== 0 && (
                    <span className="text-[11.5px] font-semibold tabular-nums text-muted-foreground/70">
                      {day.net > 0 ? "+" : "-"}
                      {fmt(Math.abs(day.net))}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border">
                  {day.items.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-2.5 py-3"
                    >
                      <span
                        className={`flex size-9.75 shrink-0 items-center justify-center rounded-xl text-base ${
                          transaction.type === "income"
                            ? "bg-primary/10 text-primary"
                            : transaction.type === "expense"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            transaction.type === "income"
                              ? "fa-arrow-down"
                              : transaction.type === "expense"
                                ? "fa-arrow-up"
                                : "fa-right-left"
                          }`}
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {transaction.type === "transfer"
                            ? `${getAccountName(transaction.fromAccountId)} to ${getAccountName(transaction.toAccountId)}`
                            : getCategoryName(transaction.categoryId)}
                        </p>

                        <p className="truncate text-[11px] text-muted-foreground">
                          {transaction.type === "transfer"
                            ? "Transfer"
                            : getAccountName(transaction.accountId)}
                          {transaction.pay
                            ? ` \u00b7 ${describePay(transaction.pay, (v) => fmt(v), formatHours)}`
                            : ""}
                          {transaction.notes
                            ? ` \u00b7 ${transaction.notes}`
                            : ""}
                          {transaction.source === "api"
                            ? " \u00b7 added by API"
                            : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            transaction.type === "income"
                              ? "text-primary"
                              : transaction.type === "expense"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {transaction.type === "expense"
                            ? "-"
                            : transaction.type === "income"
                              ? "+"
                              : ""}
                          {fmt(transaction.amount)}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onEdit(transaction)}
                          aria-label="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={dangerIconButton}
                          onClick={() => setConfirming(transaction)}
                          aria-label="Delete"
                        >
                          <i className="fa-solid fa-trash" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}

      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}

      {confirming && (
        <ConfirmModal
          title="Delete transaction?"
          message={
            <>
              This will remove the {confirming.type} of{" "}
              <strong>{fmt(confirming.amount)}</strong> on{" "}
              {formatDate(confirming.date)}. Balances will update immediately.
            </>
          }
          onConfirm={() => deleteTransaction(confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
