import { useState } from "react";

import { CategoriesTab } from "../components/categories/CategoriesTab";
import { BudgetsTab } from "../components/budgets/BudgetsTab";
import { BudgetOverviewCards } from "../components/categories/BudgetOverviewCards";

export function CategoryPage() {
  const [section, setSection] = useState("categories");
  const Section = section === "categories" ? CategoriesTab : BudgetsTab;

  return (
    <div className="space-y-6">
      {/* Shown in both sections: this month's budget at a glance. */}
      <BudgetOverviewCards />

      {/* Each section renders the shared toolbar with its own controls. */}
      <Section section={section} onSectionChange={setSection} />
    </div>
  );
}
