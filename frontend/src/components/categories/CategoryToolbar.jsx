import { Tags, Wallet } from "lucide-react";

import { TabBar } from "../ui/tab-bar";
import { PageToolbar, ToolbarDivider } from "../common/PageToolbar";

const SECTIONS = [
  { value: "categories", label: "Categories", icon: Tags },
  { value: "budgets", label: "Budgets", icon: Wallet },
];

// The Categories & Budgets page toolbar: the section switch first, then that
// section's own controls (`children`) and its main action (`actions`).
export function CategoryToolbar({
  section,
  onSectionChange,
  children,
  actions,
}) {
  return (
    <PageToolbar actions={actions}>
      <TabBar
        variant="segmented"
        aria-label="Section"
        value={section}
        onValueChange={onSectionChange}
        items={SECTIONS}
        className="lg:w-72"
      />

      <ToolbarDivider />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
      </div>
    </PageToolbar>
  );
}
