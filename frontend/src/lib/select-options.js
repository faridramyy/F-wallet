// Builds options for the <Select> component (components/ui/select.jsx).

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { ACCOUNT_TYPES } from "./accounts";
import { buildCategoryTree } from "./categories";

const SECTION_NAMES = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  credit_card: "Credit cards",
};

// Accounts in one section per type (Checking, Savings, Cash, Credit cards),
// keeping the user's account order inside each section. Empty sections are
// left out.
//   none: optional label for a "no account" option at the top
export function accountOptions(accounts, { none } = {}) {
  const sections = ACCOUNT_TYPES.map((type) => ({
    section: SECTION_NAMES[type.value] ?? type.label,
    options: accounts
      .filter((account) => account.account_type === type.value)
      .map((account) => ({
        value: account.account_id,
        label: account.account_name,
        description: account.institution_name || undefined,
        icon: type.icon,
      })),
  })).filter((section) => section.options.length > 0);

  return none ? [{ value: "", label: none }, ...sections] : sections;
}

// Categories of one type as parent rows with their sub-categories indented
// underneath, in the user's order.
//   none:    optional label for a "no category" option at the top
//   exclude: a category id to leave out together with all its sub-categories
//            (a category cannot be its own parent or a child's child)
//   extra:   an option to keep visible even if it is no longer in the list
//            (e.g. an archived category a transaction still uses)
export function categoryOptions(
  categories,
  categoryType,
  { none, exclude, extra } = {},
) {
  const icon = categoryType === "income" ? ArrowDownLeft : ArrowUpRight;
  const options = [];

  const add = (nodes, depth) => {
    for (const { category, children } of nodes) {
      if (category.category_id === exclude) continue;

      options.push({
        value: category.category_id,
        label: category.category_name,
        icon: depth === 0 ? icon : undefined,
        depth,
        parent: children.length > 0,
      });
      add(children, depth + 1);
    }
  };

  add(buildCategoryTree(categories, categoryType), 0);

  if (extra && !options.some((option) => option.value === extra.value)) {
    options.unshift(extra);
  }

  return none ? [{ value: "", label: none }, ...options] : options;
}
