import { CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";

export const ACCOUNT_TYPES = [
  {
    value: "checking",
    label: "Checking",
    icon: Landmark,
    tone: "bg-chart-2/10 text-chart-2",
  },
  {
    value: "savings",
    label: "Savings",
    icon: PiggyBank,
    tone: "bg-chart-1/10 text-chart-1",
  },
  {
    value: "cash",
    label: "Cash",
    icon: Wallet,
    tone: "bg-chart-3/10 text-chart-3",
  },
  {
    value: "credit_card",
    label: "Credit card",
    icon: CreditCard,
    tone: "bg-chart-4/10 text-chart-4",
  },
];

const FALLBACK_TYPE = {
  label: "Account",
  icon: Wallet,
  tone: "bg-muted text-muted-foreground",
};

// Label, icon and color for an account type, with a safe fallback.
export function getAccountType(type) {
  return ACCOUNT_TYPES.find((item) => item.value === type) ?? FALLBACK_TYPE;
}

const toCents = (value) => {
  const cents = Number(value ?? 0);
  return Number.isSafeInteger(cents) ? cents : 0;
};

// An account's live balance: its opening balance plus every posted
// transaction (`entries_total_cents`, sent by the API).
//
// Ledger entries are signed from the account's point of view: spending is
// negative, income positive. Cash, checking and savings therefore hold
// opening + entries. A credit card's opening balance is what you owed when
// you started tracking it, so spending on it (negative entries) adds to the
// debt and payments reduce it: owed = opening - entries.
//
//   amount      dollars to display, without sign (cards show what is owed)
//   isNegative  true for an overdrawn account or a card with a balance owed
//   netCents    what the account adds to your net money (debt is negative)
//   owedCents   what is owed on a credit card (0 otherwise)
export function getAccountBalance(account) {
  const opening = toCents(account.opening_balance_cents);
  const entries = toCents(account.entries_total_cents);

  if (account.account_type === "credit_card") {
    const owed = opening - entries;

    return {
      amount: Math.abs(owed) / 100,
      isNegative: owed > 0,
      netCents: -owed,
      owedCents: Math.max(owed, 0),
    };
  }

  const balance = opening + entries;

  return {
    amount: Math.abs(balance) / 100,
    isNegative: balance < 0,
    netCents: balance,
    owedCents: 0,
  };
}

// Totals across accounts, in cents:
//   netCents        balances of accounts counted in net worth, minus card debt
//   debtCents       owed across all credit cards
//   availableCents  credit left on cards that have a limit
//   limitCents      sum of those limits
export function summarizeAccounts(accounts) {
  let netCents = 0;
  let debtCents = 0;
  let availableCents = 0;
  let limitCents = 0;

  for (const account of accounts) {
    const { netCents: net, owedCents } = getAccountBalance(account);

    if (account.include_in_net_worth) netCents += net;

    if (account.account_type === "credit_card") {
      const limit = toCents(account.credit_limit_cents);

      debtCents += owedCents;
      if (limit > 0) {
        limitCents += limit;
        availableCents += Math.max(limit - owedCents, 0);
      }
    }
  }

  return { netCents, debtCents, availableCents, limitCents };
}
