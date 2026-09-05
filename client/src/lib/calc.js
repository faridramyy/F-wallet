import { round2, clamp } from "./format";

/*
  Every calculation from the original app, rewritten as pure functions that
  take the data they need instead of reaching into a global state object.

  The credit card rule is the part worth remembering:

    Normal account: starting + income - expenses + transfers in - transfers out
    Credit card:    starting + expenses - payments + transfers out - transfers in

  On a credit card a positive balance means debt.
*/

export const DEFAULT_OVERTIME_MULTIPLIER = 1.5;

export function normalizePay(pay) {
  if (!pay || typeof pay !== "object") return null;

  const hours = Math.max(0, Number(pay.hours) || 0);
  const rate = Math.max(0, Number(pay.rate) || 0);
  const overtimeHours = Math.max(0, Number(pay.overtimeHours) || 0);

  const overtimeMultiplier =
    Number(pay.overtimeMultiplier) > 0 ? Number(pay.overtimeMultiplier) : DEFAULT_OVERTIME_MULTIPLIER;

  if (!hours && !overtimeHours) return null;

  return { hours, rate, overtimeHours, overtimeMultiplier };
}

export function calculatePay(pay) {
  const normalized = normalizePay(pay);

  if (!normalized) {
    return { regularPay: 0, overtimePay: 0, overtimeRate: 0, totalHours: 0, total: 0 };
  }

  const { hours, rate, overtimeHours, overtimeMultiplier } = normalized;

  const overtimeRate = rate * overtimeMultiplier;
  const regularPay = hours * rate;
  const overtimePay = overtimeHours * overtimeRate;

  return {
    regularPay,
    overtimePay,
    overtimeRate,
    totalHours: hours + overtimeHours,
    total: round2(regularPay + overtimePay),
  };
}

export function describePay(pay, formatMoney, formatHoursValue) {
  const normalized = normalizePay(pay);

  if (!normalized) return "";

  const { hours, rate, overtimeHours, overtimeMultiplier } = normalized;

  const parts = [`${formatHoursValue(hours)}h @ ${formatMoney(rate)}`];

  if (overtimeHours > 0) {
    parts.push(`${formatHoursValue(overtimeHours)}h OT @ ${overtimeMultiplier}x`);
  }

  return parts.join(" + ");
}

export function isSameMonth(dateString, month) {
  return String(dateString || "").slice(0, 7) === month;
}

export function accountBalance(account, transactions) {
  if (!account) return 0;

  let balance = Number(account.startingBalance) || 0;

  const isCreditCard = account.type === "credit";

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "transfer") {
      if (transaction.fromAccountId === account.id) {
        balance += isCreditCard ? amount : -amount;
      }

      if (transaction.toAccountId === account.id) {
        balance += isCreditCard ? -amount : amount;
      }

      continue;
    }

    if (transaction.accountId !== account.id) continue;

    if (transaction.type === "expense") {
      balance += isCreditCard ? amount : -amount;
    }

    if (transaction.type === "income") {
      balance += isCreditCard ? -amount : amount;
    }
  }

  return balance;
}

export function normalAccountTotal(accounts, transactions) {
  return accounts
    .filter((account) => account.type !== "credit")
    .reduce((total, account) => total + accountBalance(account, transactions), 0);
}

export function creditCardDebt(accounts, transactions) {
  return accounts
    .filter((account) => account.type === "credit")
    .reduce((total, account) => total + Math.max(0, accountBalance(account, transactions)), 0);
}

export function availableCredit(account, transactions) {
  if (!account || account.type !== "credit") return 0;

  const limit = Math.max(0, Number(account.creditLimit) || 0);
  const debt = Math.max(0, accountBalance(account, transactions));

  return Math.max(0, limit - debt);
}

export function totalAvailableCredit(accounts, transactions) {
  return accounts
    .filter((account) => account.type === "credit")
    .reduce((total, account) => total + availableCredit(account, transactions), 0);
}

function sumBy(transactions, predicate) {
  return transactions
    .filter(predicate)
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
}

export function monthlyIncome(transactions, month) {
  return sumBy(transactions, (t) => t.type === "income" && isSameMonth(t.date, month));
}

export function monthlyExpenses(transactions, month) {
  return sumBy(transactions, (t) => t.type === "expense" && isSameMonth(t.date, month));
}

export function monthlyTransfers(transactions, month) {
  return sumBy(transactions, (t) => t.type === "transfer" && isSameMonth(t.date, month));
}

export function categorySpending(transactions, categoryId, month) {
  return sumBy(
    transactions,
    (t) => t.type === "expense" && t.categoryId === categoryId && isSameMonth(t.date, month),
  );
}

export function categoryIncomeReceived(transactions, categoryId, month) {
  return sumBy(
    transactions,
    (t) => t.type === "income" && t.categoryId === categoryId && isSameMonth(t.date, month),
  );
}

export function categoryBudget(category) {
  if (!category || category.type !== "expense") return 0;

  return Math.max(0, Number(category.monthlyBudget) || 0);
}

export function categoryExpectedIncome(category) {
  if (!category || category.type !== "income") return 0;

  return Math.max(0, Number(category.expectedIncome) || 0);
}

export function savingsRate(income, expenses) {
  if (!(income > 0)) return 0;

  return clamp(((income - expenses) / income) * 100, -999, 100);
}
