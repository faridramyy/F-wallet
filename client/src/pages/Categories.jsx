import { useMemo, useState } from "react";

import { useApp } from "../store";
import {
  Panel,
  StatCard,
  EmptyState,
  ConfirmModal,
  MonthPicker,
  ProgressBar,
} from "../components/ui";
import {
  SortableList,
  SortableItem,
  DragHandle,
  reorderWithin,
} from "../components/Reorder";
import { categorySpending, categoryIncomeReceived } from "../lib/calc";
import { money, formatMonth, currentMonth } from "../lib/format";
import CategoryModal from "../modals/CategoryModal";
import { Button } from "@/components/ui/button";

const dangerIconButton =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";

export default function Categories() {
  const {
    categories,
    transactions,
    currency,
    deleteCategory,
    reorderCategories,
  } = useApp();

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
        })),
    [categories, transactions, month],
  );

  const totalBudget = expenses.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = expenses.reduce((sum, row) => sum + row.spent, 0);
  const totalReceived = incomes.reduce((sum, row) => sum + row.received, 0);

  /*
    Reordering works on the full category list, not the filtered expense
    or income view, because order is stored once per category and drives
    the dropdowns everywhere else in the app. Dragging only ever happens
    within one of the two filtered groups though, so `reorderWithin`
    moves just that group's items and leaves the other group's positions
    untouched.
  */

  const reorderGroup = (rows, newOrder) => {
    const subsetIds = rows.map((row) => row.category.id);
    const reordered = reorderWithin(categories, subsetIds, newOrder);

    reorderCategories(reordered.map((category) => category.id));
  };

  const openNew = () => {
    setEditing(null);
    setShowModal(true);
  };

  const usageCount = (categoryId) =>
    transactions.filter((transaction) => transaction.categoryId === categoryId)
      .length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Planning
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Budgets for what goes out, expectations for what comes in.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MonthPicker
            month={month}
            onChange={setMonth}
            label={formatMonth(month)}
          />

          <Button type="button" onClick={openNew}>
            <i className="fa-solid fa-plus" />
            Add category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total budget"
          value={fmt(totalBudget)}
          help="Across expense categories"
        />
        <StatCard
          label="Spent"
          value={fmt(totalSpent)}
          tone={totalSpent > totalBudget ? "negative" : ""}
          help={formatMonth(month)}
        />
        <StatCard
          label="Left to spend"
          value={fmt(Math.max(0, totalBudget - totalSpent))}
          tone={totalBudget - totalSpent < 0 ? "negative" : "positive"}
          help={formatMonth(month)}
        />
        <StatCard
          label="Income received"
          value={fmt(totalReceived)}
          tone="positive"
          help={formatMonth(month)}
        />
      </div>

      <Panel title="Expense categories" subtitle={`${expenses.length} tracked`}>
        {expenses.length === 0 ? (
          <EmptyState
            icon="fa-layer-group"
            title="No expense categories"
            message="Create categories like Groceries or Rent so your spending has somewhere to go."
            action={
              <Button type="button" onClick={openNew}>
                Add a category
              </Button>
            }
          />
        ) : (
          <SortableList
            ids={expenses.map((row) => row.category.id)}
            onReorder={(newOrder) => reorderGroup(expenses, newOrder)}
            grid
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {expenses.map(({ category, spent, budget }) => {
                const remaining = budget - spent;

                return (
                  <SortableItem key={category.id} id={category.id}>
                    {({ attributes, listeners, isDragging }) => (
                      <div
                        className={`rounded-2xl border border-border bg-card p-3.5 ${
                          isDragging ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <DragHandle
                            attributes={attributes}
                            listeners={listeners}
                            isDragging={isDragging}
                          />

                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {category.name}
                          </span>

                          <span className="ml-auto flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditing(category);
                                setShowModal(true);
                              }}
                              aria-label="Edit"
                            >
                              <i className="fa-solid fa-pen" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className={dangerIconButton}
                              onClick={() => setConfirming(category)}
                              aria-label="Delete"
                            >
                              <i className="fa-solid fa-trash" />
                            </Button>
                          </span>
                        </div>

                        <p className="mt-2.5 text-lg font-bold tabular-nums tracking-tight">
                          {fmt(spent)}
                        </p>

                        {budget > 0 ? (
                          <>
                            <div className="mt-1.5">
                              <ProgressBar value={spent} max={budget} />
                            </div>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {remaining >= 0
                                ? `${fmt(remaining)} left of ${fmt(budget)}`
                                : `${fmt(Math.abs(remaining))} over ${fmt(budget)}`}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            No budget set
                          </p>
                        )}
                      </div>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableList>
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
          <SortableList
            ids={incomes.map((row) => row.category.id)}
            onReorder={(newOrder) => reorderGroup(incomes, newOrder)}
            grid
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {incomes.map(({ category, received }) => (
                <SortableItem key={category.id} id={category.id}>
                  {({ attributes, listeners, isDragging }) => (
                    <div
                      className={`rounded-2xl border border-border bg-card p-3.5 ${
                        isDragging ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <DragHandle
                          attributes={attributes}
                          listeners={listeners}
                          isDragging={isDragging}
                        />

                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {category.name}
                        </span>

                        <span className="ml-auto flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditing(category);
                              setShowModal(true);
                            }}
                            aria-label="Edit"
                          >
                            <i className="fa-solid fa-pen" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={dangerIconButton}
                            onClick={() => setConfirming(category)}
                            aria-label="Delete"
                          >
                            <i className="fa-solid fa-trash" />
                          </Button>
                        </span>
                      </div>

                      <p className="mt-2.5 text-lg font-bold tabular-nums tracking-tight text-primary">
                        {fmt(received)}
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {(category.entryMode ||
                          (Number(category.hourlyRate) > 0
                            ? "hourly"
                            : "fixed")) === "hourly"
                          ? `Hourly${Number(category.hourlyRate) > 0 ? ` at ${fmt(category.hourlyRate)}/h` : ""}`
                          : `Fixed amount${Number(category.defaultAmount) > 0 ? `, usually ${fmt(category.defaultAmount)}` : ""}`}
                      </p>

                      {Number(category.hourlyRate) > 0 ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {fmt(category.hourlyRate)} per hour
                          {Number(category.overtimeRate) > 0
                            ? ` · ${fmt(category.overtimeRate)} overtime`
                            : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          No pay rate set
                        </p>
                      )}
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableList>
        )}
      </Panel>

      {showModal && (
        <CategoryModal category={editing} onClose={() => setShowModal(false)} />
      )}

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
