import { useState } from "react";
import { Tags, Wallet } from "lucide-react";

import { TabBar } from "../components/ui/tab-bar";
import { CategoriesTab } from "../components/categories/CategoriesTab";
import { BudgetsTab } from "../components/budgets/BudgetsTab";

const TABS = [
  { value: "categories", label: "Categories", icon: Tags },
  { value: "budgets", label: "Budgets", icon: Wallet },
];

export function CategoryPage() {
  const [tab, setTab] = useState("categories");

  return (
    <div className="space-y-6">
      <TabBar value={tab} onValueChange={setTab} items={TABS} />
      {tab === "categories" ? <CategoriesTab /> : <BudgetsTab />}
    </div>
  );
}
