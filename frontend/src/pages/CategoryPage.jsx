import { useState } from "react";
import { Tags, Wallet } from "lucide-react";

import { TabBar } from "../components/ui/tab-bar";
import { CategoriesTab } from "../components/categories/CategoriesTab";
import { BudgetsTab } from "../components/budgets/BudgetsTab";
import { BudgetOverviewCards } from "../components/categories/BudgetOverviewCards";

const TABS = [
  { value: "categories", label: "Categories", icon: Tags },
  { value: "budgets", label: "Budgets", icon: Wallet },
];

export function CategoryPage() {
  const [tab, setTab] = useState("categories");

  return (
    <div className="space-y-6">
      {/* Shown on both tabs: this month's budget at a glance. */}
      <BudgetOverviewCards />

      <TabBar value={tab} onValueChange={setTab} items={TABS} />
      {tab === "categories" ? <CategoriesTab /> : <BudgetsTab />}
    </div>
  );
}
