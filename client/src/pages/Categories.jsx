import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Panel, StatCard, EmptyState, ConfirmModal, MonthPicker, ProgressBar } from "../components/ui";
import { categorySpending, categoryIncomeReceived } from "../lib/calc";
import { money, formatMonth, currentMonth } from "../lib/format";
import CategoryModal from "../modals/CategoryModal";

export default function Categories() {
  const { categories, transactions, currency, deleteCategory } = useApp();

  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const fmt = (value) => money(value, { currency });

  const expenses = useMemo(
    () =>
      categories
        .filter((category) => category.type === "expense")
        .map((category) => ({
          category,
          spent: categorySpending(transactions, category.id, month),
          budget: Math.max(0, Number(category.monthlyBudget) || 0),
        })),
    [categories, transactions, month],
  );

  const incomes = useMemo(
    () =>
      categories
        .filter((category) => category.type === "income")
        .map((category) => ({
          category,
          received: categoryIncomeReceived(transactions, category.id, month),
          expected: Math.max(0, Number(category.expectedIncome) || 0),
        })),
    [categories, transactions, month],
  );

  const totalBudget = expenses.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = expenses.reduce((sum, row) => sum + row.spent, 0);
  const totalExpected = incomes.reduce((sum, row) => sum + row.expected, 0);

  const openNew = () => {
    setEditing(null);
    setShowModal(true);
  };

  const usageCount = (categoryId) =>
    transactions.filter((transaction) => transaction.categoryId === categoryId).length;

  return (
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Planning</p>
          <h2 className="page-title">Categories</h2>
          <p className="page-description">Budgets for what goes out, expectations for what comes in.</p>
        </div>

        <div className="flex items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} label={formatMonth(month)} />

          <button type="button" className="primary-button" onClick={openNew}>
            <i className="fa-solid fa-plus" />
            Add category
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total budget" value={fmt(totalBudget)} help="Across expense categories" />
        <StatCard label="Spent" value={fmt(totalSpent)} tone={totalSpent > totalBudget ? "negative" : ""} help={formatMonth(month)} />
        <StatCard
          label="Left to spend"
          value={fmt(Math.max(0, totalBudget - totalSpent))}
          tone={totalBudget - totalSpent < 0 ? "negative" : "positive"}
        />
        <StatCard label="Expected income" value={fmt(totalExpected)} help="Per month" />
      </div>

      <Panel title="Expense categories" subtitle={`${expenses.length} tracked`}>
        {expenses.length === 0 ? (
          <EmptyState
            icon="fa-layer-group"
            title="No expense categories"
            message="Create categories like Groceries or Rent so your spending has somewhere to go."
            action={
              <button type="button" className="primary-button" onClick={openNew}>
                Add a category
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {expenses.map(({ category, spent, budget }) => {
              const remaining = budget - spent;

              return (
                <div key={category.id} className="category-card">
                  <div className="category-title-row">
                    <span className="category-dot" style={{ background: "#f87171" }} />

                    <span className="category-name">{category.name}</span>

                    <span className="ml-auto flex gap-1">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => {
                          setEditing(category);
                          setShowModal(true);
                        }}
                        aria-label="Edit"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>

                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => setConfirming(category)}
                        aria-label="Delete"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </span>
                  </div>

                  <p className="category-amount">{fmt(spent)}</p>

                  {budget > 0 ? (
                    <>
                      <ProgressBar value={spent} max={budget} />

                      <p className="mt-1 text-[11px] text-slate-400">
                        {remaining >= 0 ? `${fmt(remaining)} left of ${fmt(budget)}` : `${fmt(Math.abs(remaining))} over ${fmt(budget)}`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">No budget set</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Income categories" subtitle={`${incomes.length} tracked`}>
        {incomes.length === 0 ? (
          <EmptyState
            icon="fa-sack-dollar"
            title="No income categories"
            message="Add categories like Salary or Freelance to track what you expect to earn."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {incomes.map(({ category, received, expected }) => (
              <div key={category.id} className="category-card">
                <div className="category-title-row">
                  <span className="category-dot" style={{ background: "#34d399" }} />

                  <span className="category-name">{category.name}</span>

                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setEditing(category);
                        setShowModal(true);
                      }}
                      aria-label="Edit"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>

                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => setConfirming(category)}
                      aria-label="Delete"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </span>
                </div>

                <p className="category-amount text-emerald-600">{fmt(received)}</p>

                {expected > 0 ? (
                  <>
                    <ProgressBar value={received} max={expected} tone="" />

                    <p className="mt-1 text-[11px] text-slate-400">
                      {received >= expected
                        ? `Met the ${fmt(expected)} target`
                        : `${fmt(expected - received)} short of ${fmt(expected)}`}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">No target set</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {showModal && <CategoryModal category={editing} onClose={() => setShowModal(false)} />}

      {confirming && (
        <ConfirmModal
          title="Delete category?"
          message={
            <>
              You are about to delete <strong>{confirming.name}</strong>.
              <br />
              <br />
              {usageCount(confirming.id) > 0
                ? `${usageCount(confirming.id)} transaction${usageCount(confirming.id) === 1 ? "" : "s"} use this category and will become uncategorized.`
                : "No transactions currently use this category."}
              <br />
              <br />
              This cannot be undone.
            </>
          }
          onConfirm={() => deleteCategory(confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
