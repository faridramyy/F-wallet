import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Coins,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useApp } from "../store";
import {
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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
  const leftToSpend = totalBudget - totalSpent;

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

  const summaryStats = [
    {
      label: "Total Budget",
      value: fmt(totalBudget),
      help: "Across expense categories",
      icon: PiggyBank,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Spent",
      value: fmt(totalSpent),
      help: formatMonth(month),
      icon: TrendingDown,
      color: totalSpent > totalBudget ? "text-destructive" : "text-amber-500",
      bgColor:
        totalSpent > totalBudget ? "bg-destructive/10" : "bg-amber-500/10",
    },
    {
      label: "Left to Spend",
      value: fmt(Math.max(0, leftToSpend)),
      help: formatMonth(month),
      icon: Wallet,
      color: leftToSpend < 0 ? "text-destructive" : "text-emerald-500",
      bgColor: leftToSpend < 0 ? "bg-destructive/10" : "bg-emerald-500/10",
    },
    {
      label: "Income Received",
      value: fmt(totalReceived),
      help: formatMonth(month),
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

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

          <Button type="button" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bgColor} ${stat.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold tracking-tight tabular-nums">
                    {stat.value}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {stat.help}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                Expense Categories
              </CardTitle>
              <CardDescription className="text-xs">
                {expenses.length} tracked
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No expense categories"
              message="Create categories like Groceries or Rent so your spending has somewhere to go."
              action={
                <Button type="button" onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" />
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
                        <Card
                          className={`border shadow-xs transition-opacity ${
                            isDragging ? "opacity-60" : ""
                          }`}
                        >
                          <CardContent className="p-3.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <DragHandle
                                attributes={attributes}
                                listeners={listeners}
                                isDragging={isDragging}
                              />

                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {category.name}
                              </span>

                              <div className="ml-auto flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditing(category);
                                    setShowModal(true);
                                  }}
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setConfirming(category)}
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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
                          </CardContent>
                        </Card>
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            </SortableList>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                Income Categories
              </CardTitle>
              <CardDescription className="text-xs">
                {incomes.length} tracked
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <EmptyState
              icon={Coins}
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
                      <Card
                        className={`border shadow-xs transition-opacity ${
                          isDragging ? "opacity-60" : ""
                        }`}
                      >
                        <CardContent className="p-3.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <DragHandle
                              attributes={attributes}
                              listeners={listeners}
                              isDragging={isDragging}
                            />

                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {category.name}
                            </span>

                            <div className="ml-auto flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditing(category);
                                  setShowModal(true);
                                }}
                                aria-label="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setConfirming(category)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
                        </CardContent>
                      </Card>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableList>
          )}
        </CardContent>
      </Card>

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
                ? `${usageCount(confirming.id)} transaction${
                    usageCount(confirming.id) === 1 ? "" : "s"
                  } use this category and will become uncategorized.`
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
