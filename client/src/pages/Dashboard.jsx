import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useApp } from "../store";
import { Panel, StatCard, EmptyState, MonthPicker, ProgressBar } from "../components/ui";
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
import { money, moneySigned, formatDate, formatMonth, formatMonthLong, currentMonth, lastMonths } from "../lib/format";

export default function Dashboard({ onEditTransaction }) {
  const { accounts, categories, transactions, currency, getAccountName, getCategoryName } = useApp();

  const [month, setMonth] = useState(currentMonth());

  const fmt = (value) => money(value, { currency });
  const fmtSigned = (value) => moneySigned(value, currency);

  const income = monthlyIncome(transactions, month);
  const expenses = monthlyExpenses(transactions, month);
  const transfers = monthlyTransfers(transactions, month);

  const netWorth = normalAccountTotal(accounts, transactions) - creditCardDebt(accounts, transactions);

  const savings = income - expenses;
  const rate = savingsRate(income, expenses);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => (a.date === b.date ? (b.createdAt || "").localeCompare(a.createdAt || "") : b.date.localeCompare(a.date)))
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
        .filter((category) => category.type === "expense" && Number(category.monthlyBudget) > 0)
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
      if (transaction.type !== "expense" || !isSameMonth(transaction.date, month)) continue;

      const key = transaction.categoryId || "uncategorized";

      totals.set(key, (totals.get(key) || 0) + (Number(transaction.amount) || 0));
    }

    const rows = [...totals.entries()]
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort((a, b) => b.amount - a.amount);

    const total = rows.reduce((sum, row) => sum + row.amount, 0);

    return { rows: rows.slice(0, 6), total };
  }, [transactions, month]);

  const creditCards = accounts.filter((account) => account.type === "credit");

  return (
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-description">{formatMonthLong(month)}</p>
        </div>

        <MonthPicker month={month} onChange={setMonth} label={formatMonth(month)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net worth"
          value={fmt(netWorth)}
          tone={netWorth >= 0 ? "positive" : "negative"}
          help="Cash minus card debt"
        />

        <StatCard label="Income" value={fmt(income)} tone="positive" help="This month" />

        <StatCard label="Expenses" value={fmt(expenses)} tone="negative" help="This month" />

        <StatCard
          label="Saved"
          value={fmtSigned(savings)}
          tone={savings >= 0 ? "positive" : "negative"}
          help={income > 0 ? `${rate.toFixed(0)}% of income` : "No income logged"}
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
          <p className={`text-2xl font-bold tracking-tight ${savings >= 0 ? "" : "text-red-500"}`}>
            {fmtSigned(savings)}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-400">
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
              const max = Math.max(1, ...trend.map((entry) => Math.abs(entry.income - entry.expenses)));

              return (
                <div
                  key={item.month}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${Math.max(4, (Math.abs(net) / max) * 100)}%`,
                    background: net >= 0 ? "#10b981" : "#f87171",
                  }}
                  title={`${formatMonth(item.month)}: ${fmtSigned(net)}`}
                />
              );
            })}
          </div>

          <p className="mt-2 text-[10px] text-slate-400">Last 6 months</p>

          {transfers > 0 && (
            <p className="mt-3 text-[11px] text-slate-400">
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
            <Link to="/categories" className="secondary-button">
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
            <div className="space-y-3">
              {breakdown.rows.map((row) => {
                const share = breakdown.total > 0 ? (row.amount / breakdown.total) * 100 : 0;

                return (
                  <div key={row.categoryId}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {row.categoryId === "uncategorized" ? "Uncategorized" : getCategoryName(row.categoryId)}
                      </span>

                      <span className="text-slate-500">
                        {fmt(row.amount)} · {share.toFixed(0)}%
                      </span>
                    </div>

                    <ProgressBar value={share} max={100} tone="" />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Budgets"
          subtitle="Your monthly spending plan"
          action={
            <Link to="/categories" className="secondary-button">
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

                      <span className={remaining < 0 ? "font-semibold text-red-500" : "text-slate-500"}>
                        {fmt(spent)} of {fmt(budget)}
                      </span>
                    </div>

                    <ProgressBar value={spent} max={budget} />

                    <p className="mt-1 text-[11px] text-slate-400">
                      {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over budget`}
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
            <Link to="/accounts" className="secondary-button">
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
                <Link to="/accounts" className="primary-button">
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
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{account.name}</p>
                      <p className="text-[11px] capitalize text-slate-400">
                        {account.type}
                        {account.lastFour ? ` · ${account.lastFour}` : ""}
                      </p>
                    </div>

                    <p
                      className={`text-sm font-bold ${
                        isCredit ? (balance > 0 ? "text-red-500" : "text-emerald-600") : balance >= 0 ? "" : "text-red-500"
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
                  <p className="stat-label">Total debt</p>
                  <p className="text-lg font-bold text-red-500">{fmt(creditCardDebt(accounts, transactions))}</p>
                </div>

                <div>
                  <p className="stat-label">Available credit</p>
                  <p className="text-lg font-bold text-emerald-600">{fmt(totalAvailableCredit(accounts, transactions))}</p>
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
                      <span className="text-slate-500">{limit > 0 ? `${utilization.toFixed(0)}% used` : "No limit set"}</span>
                    </div>

                    <ProgressBar value={utilization} max={100} tone={utilization >= 70 ? "danger" : utilization >= 30 ? "warning" : ""} />

                    <p className="mt-1 text-[11px] text-slate-400">
                      {fmt(debt)} owing · {fmt(availableCredit(card, transactions))} available
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
          <Link to="/transactions" className="secondary-button">
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
          <div className="divide-y divide-slate-100">
            {recent.map((transaction) => (
              <button
                key={transaction.id}
                type="button"
                className="transaction-item w-full text-left"
                onClick={() => onEditTransaction(transaction)}
              >
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
                    {transaction.notes ? ` · ${transaction.notes}` : ""}
                  </p>
                </div>

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
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function CashFlowChart({ trend, currency }) {
  const max = Math.max(1, ...trend.flatMap((item) => [item.income, item.expenses]));

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {trend.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t-md bg-emerald-500/85"
                style={{ height: `${Math.max(2, (item.income / max) * 100)}%` }}
                title={`Income ${money(item.income, { currency })}`}
              />

              <div
                className="w-1/2 rounded-t-md bg-red-400/85"
                style={{ height: `${Math.max(2, (item.expenses / max) * 100)}%` }}
                title={`Expenses ${money(item.expenses, { currency })}`}
              />
            </div>

            <span className="text-[10px] font-medium text-slate-400">{formatMonth(item.month).split(" ")[0]}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Income
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> Expenses
        </span>
      </div>
    </div>
  );
}
