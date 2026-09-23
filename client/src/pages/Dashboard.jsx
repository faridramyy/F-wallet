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
} from "lucide-react";

import { useApp } from "../store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MonthPicker } from "@/components/MonthPicker";
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium">
                Net worth
              </CardDescription>
              <Scale className="size-3.5 text-muted-foreground" />
            </div>
            <CardTitle
              className={`text-2xl font-bold ${
                netWorth < 0 ? "text-destructive" : ""
              }`}
            >
              {fmt(netWorth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Cash minus card debt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium">
                Income
              </CardDescription>
              <ArrowDown className="size-3.5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              {fmt(income)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium">
                Expenses
              </CardDescription>
              <ArrowUp className="size-3.5 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              {fmt(expenses)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium">
                Saved
              </CardDescription>
              <PiggyBank className="size-3.5 text-muted-foreground" />
            </div>
            <CardTitle
              className={`text-2xl font-bold ${
                savings >= 0
                  ? "text-emerald-600 dark:text-emerald-500"
                  : "text-destructive"
              }`}
            >
              {fmtSigned(savings)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              {income > 0
                ? `${rate.toFixed(0)}% of income`
                : "No income logged"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow & Savings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="size-3.5 text-muted-foreground" />
              Cash flow
            </CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowChart trend={trend} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Vault className="size-3.5 text-muted-foreground" />
              Savings
            </CardTitle>
            <CardDescription>Income minus expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tracking-tight ${
                savings < 0 ? "text-destructive" : ""
              }`}
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

            <p className="mt-2 text-[10px] text-muted-foreground">
              Last 6 months
            </p>

            {transfers > 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                {fmt(transfers)} moved between accounts this month
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Spending & Budgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <PieChart className="size-3.5 text-muted-foreground" />
                Spending by category
              </CardTitle>
              <CardDescription>{formatMonth(month)}</CardDescription>
            </div>
            <Link
              to="/categories"
              className={buttonVariants({ variant: "outline", size: "xs" })}
            >
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            {breakdown.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BarChart2 className="size-5" />
                </div>
                <p className="text-sm font-semibold">No spending yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
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

                        <span className="shrink-0 text-muted-foreground">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Target className="size-3.5 text-muted-foreground" />
                Budgets
              </CardTitle>
              <CardDescription>Your monthly spending plan</CardDescription>
            </div>
            <Link
              to="/categories"
              className={buttonVariants({ variant: "outline", size: "xs" })}
            >
              Edit
            </Link>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Layers className="size-5" />
                </div>
                <p className="text-sm font-semibold">No budgets set</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Add a monthly budget to an expense category to track it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {budgets.slice(0, 5).map(({ category, spent, budget }) => {
                  const remaining = budget - spent;
                  const percent = Math.min(100, (spent / budget) * 100);

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

                      <Progress value={percent} className="h-2" />

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
          </CardContent>
        </Card>
      </div>

      {/* Accounts & Credit Health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="size-3.5 text-muted-foreground" />
                Accounts
              </CardTitle>
              <CardDescription>{accounts.length} tracked</CardDescription>
            </div>
            <Link
              to="/accounts"
              className={buttonVariants({ variant: "outline", size: "xs" })}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Wallet className="size-5" />
                </div>
                <p className="text-sm font-semibold">No accounts yet</p>
                <p className="mb-4 mt-1 max-w-xs text-xs text-muted-foreground">
                  Add an account to start tracking your balance.
                </p>
                <Link to="/accounts" className={buttonVariants({ size: "sm" })}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="size-3.5 text-muted-foreground" />
              Credit health
            </CardTitle>
            <CardDescription>
              {creditCards.length} card{creditCards.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {creditCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CreditCard className="size-5" />
                </div>
                <p className="text-sm font-semibold">No credit cards</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Add a credit account to track utilization and available
                  credit.
                </p>
              </div>
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

                      <Progress
                        value={Math.min(100, utilization)}
                        className="h-2"
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
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="size-3.5 text-muted-foreground" />
              Recent activity
            </CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </div>
          <Link
            to="/transactions"
            className={buttonVariants({ variant: "outline", size: "xs" })}
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Receipt className="size-5" />
              </div>
              <p className="text-sm font-semibold">Nothing logged yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
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
                        ? "bg-primary/10 text-primary"
                        : transaction.type === "expense"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
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
                className="w-1/2 rounded-t-md bg-primary/85 transition-all"
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

            <span className="text-[10px] font-medium text-muted-foreground">
              {formatMonth(item.month).split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-3" />

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
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
