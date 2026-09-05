import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Panel, StatCard, EmptyState, ConfirmModal, Field } from "../components/ui";
import { describePay } from "../lib/calc";
import { money, formatDate, formatHours } from "../lib/format";
import TransactionModal from "../modals/TransactionModal";
import TransferModal from "../modals/TransferModal";

export default function Transactions({ onEdit }) {
  const { accounts, categories, transactions, currency, deleteTransaction, getAccountName, getCategoryName } = useApp();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const fmt = (value) => money(value, { currency });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        if (typeFilter !== "all" && transaction.type !== typeFilter) return false;

        if (accountFilter !== "all") {
          const matches =
            transaction.accountId === accountFilter ||
            transaction.fromAccountId === accountFilter ||
            transaction.toAccountId === accountFilter;

          if (!matches) return false;
        }

        if (categoryFilter !== "all" && transaction.categoryId !== categoryFilter) return false;

        if (monthFilter && !String(transaction.date).startsWith(monthFilter)) return false;

        if (term) {
          const haystack = [
            transaction.notes,
            getCategoryName(transaction.categoryId),
            getAccountName(transaction.accountId),
            getAccountName(transaction.fromAccountId),
            getAccountName(transaction.toAccountId),
            String(transaction.amount),
          ]
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(term)) return false;
        }

        return true;
      })
      .sort((a, b) =>
        a.date === b.date ? (b.createdAt || "").localeCompare(a.createdAt || "") : b.date.localeCompare(a.date),
      );
  }, [transactions, search, typeFilter, accountFilter, categoryFilter, monthFilter, getAccountName, getCategoryName]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const transaction of filtered) {
      if (transaction.type === "income") income += Number(transaction.amount) || 0;
      if (transaction.type === "expense") expense += Number(transaction.amount) || 0;
    }

    return { income, expense };
  }, [filtered]);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setAccountFilter("all");
    setCategoryFilter("all");
    setMonthFilter("");
  };

  const filtersActive =
    search || typeFilter !== "all" || accountFilter !== "all" || categoryFilter !== "all" || monthFilter;

  return (
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Activity</p>
          <h2 className="page-title">Transactions</h2>
          <p className="page-description">{filtered.length} of {transactions.length} shown</p>
        </div>

        <div className="flex gap-2">
          <button type="button" className="secondary-button" onClick={() => setShowTransfer(true)} disabled={accounts.length < 2}>
            <i className="fa-solid fa-right-left" />
            Transfer
          </button>

          <button type="button" className="primary-button" onClick={() => setShowModal(true)}>
            <i className="fa-solid fa-plus" />
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Income" value={fmt(totals.income)} tone="positive" help="Matching filters" />
        <StatCard label="Expenses" value={fmt(totals.expense)} tone="negative" help="Matching filters" />
        <StatCard
          label="Net"
          value={fmt(totals.income - totals.expense)}
          tone={totals.income - totals.expense >= 0 ? "positive" : "negative"}
        />
      </div>

      <Panel>
        <div className="form-grid mb-4">
          <Field label="Search" className="sm:col-span-2">
            <input
              type="search"
              className="input"
              placeholder="Notes, category, account or amount"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>

          <Field label="Type">
            <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </Field>

          <Field label="Account">
            <select className="input" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Month">
            <input type="month" className="input" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} />
          </Field>
        </div>

        {filtersActive && (
          <button type="button" className="secondary-button mb-4" onClick={resetFilters}>
            <i className="fa-solid fa-filter-circle-xmark" />
            Clear filters
          </button>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon="fa-receipt"
            title={transactions.length === 0 ? "No transactions yet" : "Nothing matches those filters"}
            message={
              transactions.length === 0
                ? "Add your first transaction to start tracking."
                : "Try widening your search or clearing the filters."
            }
            action={
              transactions.length === 0 ? (
                <button type="button" className="primary-button" onClick={() => setShowModal(true)}>
                  Add a transaction
                </button>
              ) : null
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <span className={`transaction-icon ${transaction.type}`}>
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

                  <p className="truncate text-[11px] text-slate-400">
                    {formatDate(transaction.date)}
                    {transaction.type !== "transfer" ? ` · ${getAccountName(transaction.accountId)}` : ""}
                    {transaction.pay ? ` · ${describePay(transaction.pay, (v) => fmt(v), formatHours)}` : ""}
                    {transaction.notes ? ` · ${transaction.notes}` : ""}
                    {transaction.source === "api" ? " · added by API" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      transaction.type === "income"
                        ? "text-emerald-600"
                        : transaction.type === "expense"
                          ? "text-red-500"
                          : "text-slate-500"
                    }`}
                  >
                    {transaction.type === "expense" ? "-" : transaction.type === "income" ? "+" : ""}
                    {fmt(transaction.amount)}
                  </span>

                  <button type="button" className="icon-button" onClick={() => onEdit(transaction)} aria-label="Edit">
                    <i className="fa-solid fa-pen" />
                  </button>

                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => setConfirming(transaction)}
                    aria-label="Delete"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
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
              This will remove the {confirming.type} of <strong>{fmt(confirming.amount)}</strong> on{" "}
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
