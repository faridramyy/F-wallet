// src/pages/Dashboard.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Scale,
  ArrowDown,
  ArrowUp,
  PiggyBank,
  TrendingUp,
  Vault,
  PieChart,
  BarChart2,
  Target,
  Layers,
  Wallet,
  CreditCard,
  Receipt,
  ArrowLeftRight,
  TrendingDown,
} from "lucide-react";

import { useApp } from "../store";
import { Button, buttonVariants } from "@/components/ui/button";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { DonutChart, donutColor } from "@/components/Donut";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  const summaryStats = [
    {
      label: "Net worth",
      value: fmt(netWorth),
      help: "Cash minus card debt",
      icon: Scale,
      color: netWorth >= 0 ? "text-emerald-500" : "text-destructive",
      bgColor: netWorth >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
      isDestructiveValue: netWorth < 0,
    },
    {
      label: "Income",
      value: fmt(income),
      help: formatMonth(month),
      icon: ArrowDown,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Expenses",
      value: fmt(expenses),
      help: formatMonth(month),
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      isDestructiveValue: true,
    },
    {
      label: "Saved",
      value: fmtSigned(savings),
      help: income > 0 ? `${rate.toFixed(0)}% of income` : "No income logged",
      icon: PiggyBank,
      color: savings >= 0 ? "text-emerald-500" : "text-destructive",
      bgColor: savings >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
      isDestructiveValue: savings < 0,
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={formatMonthLong(month)}
        actions={
          <MonthPicker
            month={month}
            onChange={setMonth}
            label={formatMonth(month)}
          />
        }
      />

      {/* Overview Summary Stat Cards */}
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
                  <div
                    className={`text-xl font-bold tracking-tight tabular-nums ${
                      stat.isDestructiveValue ? "text-destructive" : ""
                    }`}
                  >
                    {stat.value}
                  </div>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    {stat.help}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cash Flow & Savings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Cash flow</CardTitle>
                <CardDescription className="text-xs">
                  Last 6 months
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CashFlowChart trend={trend} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Vault className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Savings</CardTitle>
                <CardDescription className="text-xs">
                  Income minus expenses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                savings < 0 ? "text-destructive" : ""
              }`}
            >
              {fmtSigned(savings)}
            </p>

            <p className="mt-1 text-2xs font-semibold text-muted-foreground">
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
                    className="flex-1 rounded-t-sm transition-all"
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

            <p className="mt-2 text-3xs text-muted-foreground">Last 6 months</p>

            {transfers > 0 && (
              <p className="mt-3 text-2xs text-muted-foreground">
                {fmt(transfers)} moved between accounts this month
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Spending & Budgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  Spending by category
                </CardTitle>
                <CardDescription className="text-xs">
                  {formatMonth(month)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {breakdown.rows.length === 0 ? (
              <div className="flex min-h-55 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <BarChart2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  No spending yet
                </h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Once you log expenses for this month they will break down
                  here.
                </p>
              </div>
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

                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {fmt(row.amount)} · {share.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Budgets</CardTitle>
                <CardDescription className="text-xs">
                  Your monthly spending plan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="flex min-h-55 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">No budgets set</h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Add a monthly budget to an expense category to track it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {budgets.slice(0, 5).map(({ category, spent, budget }) => {
                  const remaining = budget - spent;
                  const percentSpent = (spent / budget) * 100;

                  return (
                    <div key={category.id}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold">{category.name}</span>

                        <span
                          className={`tabular-nums ${
                            remaining < 0
                              ? "font-semibold text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {fmt(spent)} of {fmt(budget)}
                        </span>
                      </div>

                      <Progress
                        value={Math.min(100, percentSpent)}
                        className={`h-2 ${
                          percentSpent > 100
                            ? "[&>div]:bg-destructive"
                            : percentSpent >= 85
                              ? "[&>div]:bg-amber-500"
                              : ""
                        }`}
                      />

                      <p className="mt-1 text-2xs text-muted-foreground">
                        {remaining >= 0
                          ? `${fmt(remaining)} left`
                          : `${fmt(Math.abs(remaining))} over budget`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts & Credit Health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Accounts</CardTitle>
                <CardDescription className="text-xs">
                  {accounts.length} tracked
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="flex min-h-55 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  No accounts yet
                </h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Add an account to start tracking your balance.
                </p>
                <Link
                  to="/accounts"
                  className={buttonVariants({ size: "sm", className: "mt-6" })}
                >
                  Add account
                </Link>
              </div>
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
                        <p className="text-2xs capitalize text-muted-foreground">
                          {account.type}
                          {account.lastFour ? ` · ${account.lastFour}` : ""}
                        </p>
                      </div>

                      <p
                        className={`text-sm font-bold tabular-nums ${
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  Credit health
                </CardTitle>
                <CardDescription className="text-xs">
                  {creditCards.length} card{creditCards.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {creditCards.length === 0 ? (
              <div className="flex min-h-55 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  No credit cards
                </h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Add a credit account to track utilization and available
                  credit.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total debt
                    </p>
                    <p className="text-lg font-bold text-destructive tabular-nums">
                      {fmt(creditCardDebt(accounts, transactions))}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Available credit
                    </p>
                    <p className="text-lg font-bold text-blue-500 tabular-nums">
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

                      <Progress
                        value={Math.min(100, utilization)}
                        className={`h-2 ${
                          utilization >= 70
                            ? "[&>div]:bg-destructive"
                            : utilization >= 30
                              ? "[&>div]:bg-amber-500"
                              : ""
                        }`}
                      />

                      <p className="mt-1 text-2xs text-muted-foreground">
                        {fmt(debt)} owing ·{" "}
                        {fmt(availableCredit(card, transactions))} available
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                Recent activity
              </CardTitle>
              <CardDescription className="text-xs">
                Your latest transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex min-h-55 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                Nothing logged yet
              </h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Add your first transaction to see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() => onEditTransaction(transaction)}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-base ${
                      transaction.type === "income"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : transaction.type === "expense"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowDown className="size-4" />
                    ) : transaction.type === "expense" ? (
                      <ArrowUp className="size-4" />
                    ) : (
                      <ArrowLeftRight className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {transaction.type === "transfer"
                        ? `${getAccountName(transaction.fromAccountId)} to ${getAccountName(transaction.toAccountId)}`
                        : getCategoryName(transaction.categoryId)}
                    </p>

                    <p className="truncate text-2xs text-muted-foreground">
                      {formatDate(transaction.date)}
                      {transaction.type !== "transfer"
                        ? ` · ${getAccountName(transaction.accountId)}`
                        : ""}
                      {transaction.notes ? ` · ${transaction.notes}` : ""}
                    </p>
                  </div>

                  <span
                    className={`text-sm font-bold tabular-nums ${
                      transaction.type === "income"
                        ? "text-emerald-500"
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
        </CardContent>
      </Card>
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
                className="w-1/2 rounded-t-md bg-emerald-500/85 transition-all"
                style={{ height: `${Math.max(2, (item.income / max) * 100)}%` }}
                title={`Income ${money(item.income, { currency })}`}
              />

              <div
                className="w-1/2 rounded-t-md bg-destructive/85 transition-all"
                style={{
                  height: `${Math.max(2, (item.expenses / max) * 100)}%`,
                }}
                title={`Expenses ${money(item.expenses, { currency })}`}
              />
            </div>

            <span className="text-3xs font-medium text-muted-foreground">
              {formatMonth(item.month).split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-2xs text-muted-foreground border-t pt-3">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2.5 rounded-sm bg-emerald-500" />{" "}
          Income
        </span>

        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2.5 rounded-sm bg-destructive" />{" "}
          Expenses
        </span>
      </div>
    </div>
  );
}
