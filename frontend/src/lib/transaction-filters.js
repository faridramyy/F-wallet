// Filtering the transactions list. Every filter is optional ("" = any).
//   search      text found in description, merchant, category, accounts,
//               notes or the refunded expense's title
//   accountId   either side of a transfer counts
//   categoryId  a parent also matches its sub-categories;
//               UNCATEGORIZED matches transactions without a category
//   type        "income" | "expense" | "transfer" | "refund"
//   from, to    "YYYY-MM-DD", inclusive

export const UNCATEGORIZED = "uncategorized";

export const EMPTY_FILTERS = {
  search: "",
  accountId: "",
  categoryId: "",
  type: "",
  from: "",
  to: "",
};

export const hasActiveFilters = (filters) =>
  Object.values(filters).some((value) => value !== "");

const SEARCH_FIELDS = [
  "description",
  "merchant",
  "category_name",
  "account_name",
  "to_account_name",
  "notes",
  "original_title",
];

// The category and all of its sub-categories, at any depth.
function withDescendants(categoryId, categories) {
  const ids = new Set([categoryId]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const category of categories) {
      if (
        ids.has(category.parent_category_id) &&
        !ids.has(category.category_id)
      ) {
        ids.add(category.category_id);
        grew = true;
      }
    }
  }

  return ids;
}

export function filterTransactions(transactions, filters, categories) {
  const term = filters.search.trim().toLowerCase();
  const categoryIds =
    filters.categoryId && filters.categoryId !== UNCATEGORIZED
      ? withDescendants(filters.categoryId, categories)
      : null;

  return transactions.filter((t) => {
    if (filters.type && t.transaction_type !== filters.type) return false;

    if (
      filters.accountId &&
      t.account_id !== filters.accountId &&
      t.to_account_id !== filters.accountId
    ) {
      return false;
    }

    if (filters.categoryId === UNCATEGORIZED) {
      // Transfers never have a category, so they are not "uncategorized".
      if (t.category_id || t.transaction_type === "transfer") return false;
    } else if (categoryIds && !categoryIds.has(t.category_id)) {
      return false;
    }

    if (filters.from && t.transaction_date < filters.from) return false;
    if (filters.to && t.transaction_date > filters.to) return false;

    if (
      term &&
      !SEARCH_FIELDS.some((field) => t[field]?.toLowerCase().includes(term))
    ) {
      return false;
    }

    return true;
  });
}
