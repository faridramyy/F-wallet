import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Undo2,
} from "lucide-react";

// How each transaction type looks everywhere in the UI: its icon, the sign
// in front of its amount, and its color classes (theme tokens, index.css).
//   text:  amount text      badge: icon circle      dot: small marker
const TONES = {
  income: {
    text: "text-income",
    badge: "bg-income/10 text-income",
    dot: "bg-income",
  },
  expense: {
    text: "text-expense",
    badge: "bg-expense/10 text-expense",
    dot: "bg-expense",
  },
  transfer: {
    text: "text-transfer",
    badge: "bg-transfer/10 text-transfer",
    dot: "bg-transfer",
  },
};

const KINDS = {
  income: { icon: ArrowDownLeft, sign: "+", ...TONES.income },
  expense: { icon: ArrowUpRight, sign: "-", ...TONES.expense },
  transfer: { icon: ArrowLeftRight, sign: "", ...TONES.transfer },
  // Money back for an expense, so it looks like income.
  refund: { icon: Undo2, sign: "+", ...TONES.income },
};

export const getTransactionKind = (type) => KINDS[type] ?? KINDS.expense;
