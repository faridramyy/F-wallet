import { CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";

// Lucide icon for each account type. Falls back to CreditCard for unknowns.
export const ACCOUNT_TYPE_ICONS = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Wallet,
};

// Display label for each account type.
export const ACCOUNT_TYPE_LABELS = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  cash: "Cash",
};
