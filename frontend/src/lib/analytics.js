// Pure calculations over the loaded transactions, for overview cards and
// dashboard charts. All money is in integer cents.

import { formatMonthShort } from "./formatters";

// The dashboard can look back this many months (including this one), and
// its cash-flow chart shows this many months ending at the chosen month.
// The app loads enough history to cover both.
export const SELECTABLE_MONTHS = 12;
export const CASH_FLOW_MONTHS = 6;
export const HISTORY_MONTHS = SELECTABLE_MONTHS + CASH_FLOW_MONTHS - 1;

const pad = (value) => String(value).padStart(2, "0");

// "YYYY-MM" for a year and 1-based month.
export const monthKey = (year, month) => `${year}-${pad(month)}`;

export const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

// The calendar month `offset` months from (year, month); offset may be negative.
export function shiftMonth(year, month, offset) {
  const date = new Date(year, month - 1 + offset, 1);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  return { year: y, month: m, key: monthKey(y, m) };
}

// The current month, the previous one, and today's day of the month.
export function getMonthContext(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return {
    current: { year, month, key: monthKey(year, month) },
    previous: shiftMonth(year, month, -1),
    today: now.getDate(),
  };
}

// Context for a chosen month: that month, the one before, how many of its
// days have happened ("today" for the current month, all of them for a past
// one), and whether it is the current month.
export function getSelectedMonthContext(year, month, now = new Date()) {
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
  const days = daysInMonth(year, month);

  return {
    current: { year, month, key: monthKey(year, month) },
    previous: shiftMonth(year, month, -1),
    today: isCurrent ? now.getDate() : days,
    days,
    isCurrent,
  };
}

// The last `count` months, oldest first, with a short label ("Jun").
export function lastMonths(count, now = new Date()) {
  const { current } = getMonthContext(now);

  return Array.from({ length: count }, (_, index) => {
    const month = shiftMonth(current.year, current.month, index - count + 1);
    return {
      ...month,
      label: formatMonthShort(month.year, month.month),
    };
  });
}

const cents = (transaction) => Number(transaction.amount_cents ?? 0);
const dayOf = (transaction) =>
  Number(transaction.transaction_date.slice(8, 10));

const inMonth = (transaction, key, throughDay = 31) =>
  transaction.transaction_date?.startsWith(key) &&
  dayOf(transaction) <= throughDay;

// What a transaction adds to spending: an expense adds its amount and a
// refund takes it back. Income and transfers are not spending.
const spendingCents = (transaction) => {
  if (transaction.transaction_type === "expense") return cents(transaction);
  if (transaction.transaction_type === "refund") return -cents(transaction);
  return 0;
};

// Income, spending and net for a list of transactions. Spending is expenses
// minus refunds. Transfers move money between your own accounts, so they are
// left out.
export function summarize(transactions) {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const transaction of transactions) {
    if (transaction.transaction_type === "income") {
      income += cents(transaction);
      incomeCount += 1;
    } else if (transaction.transaction_type === "expense") {
      expenseCount += 1;
    }
    expense += spendingCents(transaction);
  }

  return {
    income,
    expense,
    net: income - expense,
    count: incomeCount + expenseCount,
    incomeCount,
    expenseCount,
    // Share of income kept; null when there was no income to measure against.
    savingsRate: income > 0 ? (income - expense) / income : null,
  };
}

// summarize() for one month, optionally only through a given day.
export const summarizeMonth = (transactions, key, throughDay) =>
  summarize(transactions.filter((t) => inMonth(t, key, throughDay)));

// Fractional change from `previous` to `current`; null when there is no base.
export const percentChange = (current, previous) =>
  previous > 0 ? (current - previous) / previous : null;

// Income and expenses per month, for the given months (oldest first).
export function monthlyCashFlow(transactions, months) {
  return months.map((month) => ({
    ...month,
    ...summarizeMonth(transactions, month.key),
  }));
}

// Spending (expenses minus refunds) per category in a month, largest first.
// Everything past `limit` categories is folded into "Other".
export function spendingByCategory(transactions, key, limit = 5) {
  const totals = new Map();

  for (const t of transactions) {
    if (!spendingCents(t) || !inMonth(t, key)) continue;

    const id = t.category_id ?? "uncategorized";
    const entry = totals.get(id) ?? {
      id,
      name: t.category_name ?? "Uncategorized",
      cents: 0,
    };

    entry.cents += spendingCents(t);
    totals.set(id, entry);
  }

  // A category fully refunded this month has nothing left to show.
  const ranked = [...totals.values()]
    .filter((entry) => entry.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  if (ranked.length <= limit + 1) return ranked;

  const rest = ranked.slice(limit);
  return [
    ...ranked.slice(0, limit),
    {
      id: "other",
      name: `Other (${rest.length})`,
      cents: rest.reduce((sum, item) => sum + item.cents, 0),
    },
  ];
}

// Running total of expenses for each day of a month: index 0 is day 1.
export function cumulativeDailySpending(transactions, year, month) {
  const key = monthKey(year, month);
  const daily = new Array(daysInMonth(year, month)).fill(0);

  for (const t of transactions) {
    if (inMonth(t, key)) daily[dayOf(t) - 1] += spendingCents(t);
  }

  let total = 0;
  return daily.map((value) => (total += value));
}

// The single biggest expense in a month, or null.
export function largestExpense(transactions, key) {
  let largest = null;

  for (const t of transactions) {
    if (
      t.transaction_type === "expense" &&
      inMonth(t, key) &&
      (!largest || cents(t) > cents(largest))
    ) {
      largest = t;
    }
  }

  return largest;
}

// The merchant with the most expense spending in a month, or null.
export function topMerchant(transactions, key) {
  const totals = new Map();

  for (const t of transactions) {
    if (t.transaction_type === "expense" && t.merchant && inMonth(t, key)) {
      totals.set(t.merchant, (totals.get(t.merchant) ?? 0) + cents(t));
    }
  }

  let top = null;
  for (const [name, total] of totals) {
    if (!top || total > top.cents) top = { name, cents: total };
  }

  return top;
}

// A "nice" axis maximum (1, 2, 2.5 or 5 × a power of ten) at or above
// `value`, and evenly spaced ticks from 0 up to it.
export function niceScale(value, tickCount = 4) {
  if (value <= 0) return { max: 1, ticks: [0, 1] };

  const rawStep = value / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    [1, 2, 2.5, 5, 10].map((n) => n * magnitude).find((n) => n >= rawStep) ??
    10 * magnitude;
  const max = step * Math.ceil(value / step);

  return {
    max,
    ticks: Array.from(
      { length: Math.round(max / step) + 1 },
      (_, i) => i * step,
    ),
  };
}

// A month's budget and its active expense-category allocations.
//   totalCents: what was budgeted across those categories (0 without a budget)
export function getMonthBudget(budgets, year, month) {
  const budget =
    budgets.find(
      (b) => Number(b.budget_year) === year && Number(b.budget_month) === month,
    ) ?? null;

  const allocations = (budget?.allocations ?? []).filter(
    (a) => a.category_type === "expense" && !a.category_is_archived,
  );

  return {
    budget,
    allocations,
    totalCents: allocations.reduce(
      (sum, a) => sum + Number(a.allocated_cents ?? 0),
      0,
    ),
  };
}

// Spending (expenses minus refunds) per category id in a "YYYY-MM" month,
// with no folding, unlike spendingByCategory. Uncategorized is left out.
export function expenseCentsByCategory(transactions, key) {
  const spending = {};

  for (const t of transactions) {
    if (spendingCents(t) && t.category_id && inMonth(t, key)) {
      spending[t.category_id] =
        (spending[t.category_id] ?? 0) + spendingCents(t);
    }
  }

  return spending;
}
