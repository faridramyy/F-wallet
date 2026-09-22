import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useApp } from "../store";
import {
  Panel,
  StatCard,
  EmptyState,
  MonthPicker,
  ProgressBar,
  DonutChart,
  donutColor,
} from "../components/ui";
import {
  accountBalance,
  normalAccountTotal,
  creditCardDebt,
  totalAvailableCredit,
  availableCredit,
  monthlyIncome,
  monthlyExpenses,
  monthlyTransfers,
  categorySpending,
  savingsRate,
  isSameMonth,
} from "../lib/calc";
import {
  money,
  moneySigned,
  formatDate,
  formatMonth,
  formatMonthLong,
  currentMonth,
  lastMonths,
} from "../lib/format";

// A small "outline" style link, matching the Button component's own
// outline variant, for places a <Link> needs button-like chrome without
// depending on whether Button supports rendering as another element.
const linkButtonClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted";

export default function Dashboard({ onEditTransaction }) {
  const {
    accounts,
    categories,
    transactions,
    currency,
    getAccountName,
    getCategoryName,
  } = useApp();

  const [month, setMonth] = useState(currentMonth());

  const fmt = (value) => money(value, { currency });
  const fmtSigned = (value) => moneySigned(value, currency);

  const income = monthlyIncome(transactions, month);
  const expenses = monthlyExpenses(transactions, month);
  const transfers = monthlyTransfers(transactions, month);

  const netWorth =
    normalAccountTotal(accounts, transactions) -
    creditCardDebt(accounts, transactions);

  const savings = income - expenses;
  const rate = savingsRate(income, expenses);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) =>
          a.date === b.date
            ? (b.createdAt || "").localeCompare(a.createdAt || "")
            : b.date.localeCompare(a.date),
        )
        .slice(0, 6),
    [transactions],
  );

  const trend = useMemo(
    () =>
      lastMonths(6, month).map((m) => ({
        month: m,
        income: monthlyIncome(transactions, m),
        expenses: monthlyExpenses(transactions, m),
      })),
    [transactions, month],
  );

  const budgets = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.type === "expense" && Number(category.monthlyBudget) > 0,
        )
        .map((category) => ({
          category,
          spent: categorySpending(transactions, category.id, month),
          budget: Number(category.monthlyBudget) || 0,
        }))
        .sort((a, b) => b.spent / (b.budget || 1) - a.spent / (a.budget || 1)),
    [categories, transactions, month],
  );

  const breakdown = useMemo(() => {
    const totals = new Map();

    for (const transaction of transactions) {
      if (
        transaction.type !== "expense" ||
        !isSameMonth(transaction.date, month)
      )
        continue;

      const key = transaction.categoryId || "uncategorized";

      totals.set(
        key,
        (totals.get(key) || 0) + (Number(transaction.amount) || 0),
      );
    }

    const rows = [...totals.entries()]
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort((a, b) => b.amount - a.amount);

    const total = rows.reduce((sum, row) => sum + row.amount, 0);

    return { rows: rows.slice(0, 6), total };
  }, [transactions, month]);

  const creditCards = accounts.filter((account) => account.type === "credit");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Overview
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMonthLong(month)}
          </p>
        </div>

        <MonthPicker
          month={month}
          onChange={setMonth}
          label={formatMonth(month)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net worth"
          value={fmt(netWorth)}
          tone={netWorth >= 0 ? "positive" : "negative"}
          help="Cash minus card debt"
        />

        <StatCard
          label="Income"
          value={fmt(income)}
          tone="positive"
          help="This month"
        />

        <StatCard
          label="Expenses"
          value={fmt(expenses)}
          tone="negative"
          help="This month"
        />

        <StatCard
          label="Saved"
          value={fmtSigned(savings)}
          tone={savings >= 0 ? "positive" : "negative"}
          help={
            income > 0 ? `${rate.toFixed(0)}% of income` : "No income logged"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Cash flow"
          subtitle="Last 6 months"
          className="lg:col-span-2"
        >
          <CashFlowChart trend={trend} currency={currency} />
        </Panel>

        <Panel title="Savings" subtitle="Income minus expenses">
          <p
            className={`text-2xl font-bold tracking-tight ${savings >= 0 ? "" : "text-destructive"}`}
          >
            {fmtSigned(savings)}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {income <= 0
              ? "No income logged"
              : rate >= 20
                ? "Healthy savings rate"
                : rate >= 0
                  ? "Tight, but positive"
                  : "Spending more than you earn"}
          </p>

          <div className="mt-4 flex h-14 items-end gap-1.5">
            {trend.map((item) => {
              const net = item.income - item.expenses;
              const max = Math.max(
                1,
                ...trend.map((entry) =>
                  Math.abs(entry.income - entry.expenses),
                ),
              );

              return (
                <div
                  key={item.month}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${Math.max(4, (Math.abs(net) / max) * 100)}%`,
                    background:
                      net >= 0 ? "var(--primary)" : "var(--destructive)",
                  }}
                  title={`${formatMonth(item.month)}: ${fmtSigned(net)}`}
                />
              );
            })}
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground">
            Last 6 months
          </p>

          {transfers > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {fmt(transfers)} moved between accounts this month
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Spending by category"
          subtitle={formatMonth(month)}
          action={
            <Link to="/categories" className={linkButtonClass}>
              Manage
            </Link>
          }
        >
          {breakdown.rows.length === 0 ? (
            <EmptyState
              icon="fa-chart-simple"
              title="No spending yet"
              message="Once you log expenses for this month they will break down here."
            />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <DonutChart
                data={breakdown.rows.map((row) => ({
                  id: row.categoryId,
                  label:
                    row.categoryId === "uncategorized"
                      ? "Uncategorized"
                      : getCategoryName(row.categoryId),
                  value: row.amount,
                }))}
                value={fmt(breakdown.total)}
                label="Total"
              />

              <div className="w-full flex-1 space-y-2.5">
                {breakdown.rows.map((row, index) => {
                  const share =
                    breakdown.total > 0
                      ? (row.amount / breakdown.total) * 100
                      : 0;

                  return (
                    <div
                      key={row.categoryId}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2 font-semibold">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: donutColor(index) }}
                        />
                        <span className="truncate">
                          {row.categoryId === "uncategorized"
                            ? "Uncategorized"
                            : getCategoryName(row.categoryId)}
                        </span>
                      </span>

                      <span className="shrink-0 text-muted-foreground">
                        {fmt(row.amount)} · {share.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Budgets"
          subtitle="Your monthly spending plan"
          action={
            <Link to="/categories" className={linkButtonClass}>
              Edit
            </Link>
          }
        >
          {budgets.length === 0 ? (
            <EmptyState
              icon="fa-layer-group"
              title="No budgets set"
              message="Add a monthly budget to an expense category to track it here."
            />
          ) : (
            <div className="space-y-3.5">
              {budgets.slice(0, 5).map(({ category, spent, budget }) => {
                const remaining = budget - spent;

                return (
                  <div key={category.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">{category.name}</span>

                      <span
                        className={
                          remaining < 0
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {fmt(spent)} of {fmt(budget)}
                      </span>
                    </div>

                    <ProgressBar value={spent} max={budget} />

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {remaining >= 0
                        ? `${fmt(remaining)} left`
                        : `${fmt(Math.abs(remaining))} over budget`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Accounts"
          subtitle={`${accounts.length} tracked`}
          action={
            <Link to="/accounts" className={linkButtonClass}>
              View all
            </Link>
          }
        >
          {accounts.length === 0 ? (
            <EmptyState
              icon="fa-wallet"
              title="No accounts yet"
              message="Add an account to start tracking your balance."
              action={
                <Link
                  to="/accounts"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  Add account
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {accounts.slice(0, 5).map((account) => {
                const balance = accountBalance(account, transactions);
                const isCredit = account.type === "credit";

                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {account.name}
                      </p>
                      <p className="text-[11px] capitalize text-muted-foreground">
                        {account.type}
                        {account.lastFour ? ` · ${account.lastFour}` : ""}
                      </p>
                    </div>

                    <p
                      className={`text-sm font-bold ${
                        isCredit
                          ? balance > 0
                            ? "text-destructive"
                            : "text-primary"
                          : balance >= 0
                            ? ""
                            : "text-destructive"
                      }`}
                    >
                      {fmt(balance)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Credit health"
          subtitle={`${creditCards.length} card${creditCards.length === 1 ? "" : "s"}`}
        >
          {creditCards.length === 0 ? (
            <EmptyState
              icon="fa-credit-card"
              title="No credit cards"
              message="Add a credit account to track utilization and available credit."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total debt
                  </p>
                  <p className="text-lg font-bold text-destructive">
                    {fmt(creditCardDebt(accounts, transactions))}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Available credit
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {fmt(totalAvailableCredit(accounts, transactions))}
                  </p>
                </div>
              </div>

              {creditCards.map((card) => {
                const debt = Math.max(0, accountBalance(card, transactions));
                const limit = Math.max(0, Number(card.creditLimit) || 0);
                const utilization = limit > 0 ? (debt / limit) * 100 : 0;

                return (
                  <div key={card.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">{card.name}</span>
                      <span className="text-muted-foreground">
                        {limit > 0
                          ? `${utilization.toFixed(0)}% used`
                          : "No limit set"}
                      </span>
                    </div>

                    <ProgressBar
                      value={utilization}
                      max={100}
                      tone={
                        utilization >= 70
                          ? "danger"
                          : utilization >= 30
                            ? "warning"
                            : ""
                      }
                    />

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {fmt(debt)} owing ·{" "}
                      {fmt(availableCredit(card, transactions))} available
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent activity"
        subtitle="Your latest transactions"
        action={
          <Link to="/transactions" className={linkButtonClass}>
            View all
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            icon="fa-receipt"
            title="Nothing logged yet"
            message="Add your first transaction to see it here."
          />
        ) : (
          <div className="divide-y divide-border">
            {recent.map((transaction) => (
              <button
                key={transaction.id}
                type="button"
                className="flex w-full items-center gap-2.5 py-3 text-left"
                onClick={() => onEditTransaction(transaction)}
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
                    {formatDate(transaction.date)}
                    {transaction.type !== "transfer"
                      ? ` · ${getAccountName(transaction.accountId)}`
                      : ""}
                    {transaction.notes ? ` · ${transaction.notes}` : ""}
                  </p>
                </div>

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
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function CashFlowChart({ trend, currency }) {
  const max = Math.max(
    1,
    ...trend.flatMap((item) => [item.income, item.expenses]),
  );

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {trend.map((item) => (
          <div
            key={item.month}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t-md bg-primary/85"
                style={{ height: `${Math.max(2, (item.income / max) * 100)}%` }}
                title={`Income ${money(item.income, { currency })}`}
              />

              <div
                className="w-1/2 rounded-t-md bg-destructive/85"
                style={{
                  height: `${Math.max(2, (item.expenses / max) * 100)}%`,
                }}
                title={`Expenses ${money(item.expenses, { currency })}`}
              />
            </div>

            <span className="text-[10px] font-medium text-muted-foreground">
              {formatMonth(item.month).split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-primary" />{" "}
          Income
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-destructive" />{" "}
          Expenses
        </span>
      </div>
    </div>
  );
}
