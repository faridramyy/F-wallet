import { CarFront, Coffee, Landmark, ShoppingBag, Zap } from "lucide-react";

export const initialTransactions = [
  {
    id: 1,
    name: "Grocery shopping",
    category: "Groceries",
    account: "Everyday Checking",
    date: "Today",
    amount: -124.85,
    type: "expense",
    icon: ShoppingBag,
  },
  {
    id: 2,
    name: "Monthly salary",
    category: "Income",
    account: "Everyday Checking",
    date: "Today",
    amount: 4250,
    type: "income",
    icon: Landmark,
  },
  {
    id: 3,
    name: "Gas station",
    category: "Transportation",
    account: "Visa Credit Card",
    date: "Yesterday",
    amount: -68.4,
    type: "expense",
    icon: CarFront,
  },
  {
    id: 4,
    name: "Coffee shop",
    category: "Dining",
    account: "Everyday Checking",
    date: "Yesterday",
    amount: -8.75,
    type: "expense",
    icon: Coffee,
  },
  {
    id: 5,
    name: "Electricity bill",
    category: "Utilities",
    account: "Everyday Checking",
    date: "Nov 15",
    amount: -94.2,
    type: "expense",
    icon: Zap,
  },
];

export const accounts = [
  {
    name: "Everyday Checking",
    institution: "TD Canada Trust",
    type: "Checking",
    balance: 8240.5,
    color: "bg-blue-50 text-blue-700",
  },
  {
    name: "High Interest Savings",
    institution: "EQ Bank",
    type: "Savings",
    balance: 15200,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Visa Credit Card",
    institution: "TD Canada Trust",
    type: "Credit card",
    balance: -1245.8,
    color: "bg-violet-50 text-violet-700",
  },
];

export const budgets = [
  { name: "Groceries", spent: 420, limit: 600 },
  { name: "Transportation", spent: 185, limit: 300 },
  { name: "Dining", spent: 245, limit: 250 },
  { name: "Shopping", spent: 130, limit: 350 },
];
