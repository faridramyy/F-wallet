import { CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking", icon: Landmark, tone: "bg-chart-2/10 text-chart-2" },
  { value: "savings", label: "Savings", icon: PiggyBank, tone: "bg-chart-1/10 text-chart-1" },
  { value: "cash", label: "Cash", icon: Wallet, tone: "bg-chart-3/10 text-chart-3" },
  { value: "credit_card", label: "Credit card", icon: CreditCard, tone: "bg-chart-4/10 text-chart-4" },
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

// The balance to show for an account, in dollars.
// Credit cards show what is owed (no sign); an amount owed is "negative".
export function getAccountBalance(account) {
  const cents = Number(account.opening_balance_cents ?? 0);
  const balance = Number.isSafeInteger(cents) ? cents / 100 : 0;
  const isCreditCard = account.account_type === "credit_card";

  return {
    amount: Math.abs(balance),
    isNegative: isCreditCard ? balance > 0 : balance < 0,
  };
}
