import {
  ArrowLeftRight,
  CreditCard,
  LayoutDashboard,
  Settings,
  Tags,
} from "lucide-react";

// Single source of truth for routes and navigation.
// `label` is used on desktop and as the page title,
// `mobileLabel` is the shorter text shown in the mobile bottom bar.
export const navigation = [
  {
    path: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    path: "/transactions",
    label: "Transactions",
    mobileLabel: "Activity",
    icon: ArrowLeftRight,
  },
  {
    path: "/accounts",
    label: "Accounts",
    mobileLabel: "Accounts",
    icon: CreditCard,
  },
  {
    path: "/categories",
    label: "Categories & Budgets",
    mobileLabel: "Categories",
    icon: Tags,
  },
  {
    path: "/settings",
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
  },
];
