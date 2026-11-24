import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { Archive, ArrowDownLeft, ArrowUpRight, Plus, Tags } from "lucide-react";

import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { TabBar } from "../ui/tab-bar";
import { ArchivedList } from "../common/ArchivedList";
import { SortableList } from "../common/SortableList";
import { CategoryBlock } from "./CategoryBlock";
import { CategoryDialog } from "./CategoryDialog";
import { CategoryToolbar } from "./CategoryToolbar";
import { CountLabel } from "../common/PageToolbar";
import { useNotifications } from "../providers/useNotifications";
import { useAppData } from "../providers/useAppData";
import { createApi } from "../../lib/api";
import { removeById, replaceById } from "../../lib/collections";
import {
  expenseCentsByCategory,
  getMonthBudget,
  getMonthContext,
} from "../../lib/analytics";
import {
  buildCategoryTree,
  flattenCategoryTree,
  moveWithinParent,
} from "../../lib/categories";

// The Categories section: one switch for Expenses / Income / Archived.
export function CategoriesTab({ section, onSectionChange }) {
  const api = createApi(useAuth());
  const { toast, confirm } = useNotifications();
  const {
    categories,
    setCategories,
    archivedCategories,
    setArchivedCategories,
    accounts,
    budgets,
    transactions,
    settings,
  } = useAppData();

  // "expense" | "income" | "archived"
  const [view, setView] = useState("expense");
  const isArchived = view === "archived";
  const filter = isArchived ? "expense" : view;
  // null = closed, {} = creating, { category } = editing
  const [dialog, setDialog] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const editingCategory = dialog?.category ?? null;
  // Top-level categories of the chosen type, each with its sub-categories.
  const tree = buildCategoryTree(categories, filter);

  // This month's budget use per budgeted category: { spentCents, limitCents }.
  const { current } = getMonthContext();
  const spent = expenseCentsByCategory(transactions, current.key);
  const budgetUsage = new Map(
    getMonthBudget(budgets, current.year, current.month).allocations.map(
      (allocation) => [
        allocation.category_id,
        {
          spentCents: spent[allocation.category_id] ?? 0,
          limitCents: Number(allocation.allocated_cents ?? 0),
        },
      ],
    ),
  );

  const countOf = (type) =>
    categories.filter((c) => c.category_type === type).length;

  // Looked up once per render instead of once per card.
  const accountNames = new Map(
    accounts.map((a) => [a.account_id, a.account_name]),
  );

  // CategoryDialog shows its own success/error messages; errors are rethrown.
  async function handleSaveCategory(body) {
    if (editingCategory) {
      const { data } = await api.patch(
        `/categories/${editingCategory.category_id}`,
        body,
      );
      setCategories((current) =>
        replaceById(current, "category_id", data.category),
      );
    } else {
      const { data } = await api.post("/categories", body);
      setCategories((current) => [...current, data.category]);
    }
  }

  async function handleArchiveCategory(category) {
    const confirmed = await confirm({
      title: "Archive category?",
      description: `Are you sure you want to archive "${category.category_name}"? It will no longer appear in your active categories.`,
      confirmText: "Archive category",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const { data } = await api.delete(`/categories/${category.category_id}`);

      setCategories((current) =>
        removeById(current, "category_id", category.category_id),
      );
      // Newest archived first, matching the order the server returns.
      setArchivedCategories((current) => [data.category, ...current]);
      toast.success("Category archived.");
    } catch (err) {
      toast.error(err.message || "Unable to archive category.");
    }
  }

  async function handleRestoreCategory(category) {
    try {
      const { data } = await api.post(
        `/categories/${category.category_id}/restore`,
      );

      setArchivedCategories((current) =>
        removeById(current, "category_id", category.category_id),
      );
      setCategories((current) => [...current, data.category]);
      toast.success("Category restored.");
    } catch (err) {
      toast.error(err.message || "Unable to restore category.");
    }
  }

  // Optimistic reorder of one sibling list (top-level categories when
  // parentId is null). Parents move with their sub-categories; the other
  // category type keeps its positions. Rolls back if saving fails.
  async function handleReorder(parentId, from, to) {
    const previous = categories;
    const reorderedVisible = flattenCategoryTree(
      moveWithinParent(tree, parentId, from, to),
    );
    const visibleIds = new Set(reorderedVisible.map((c) => c.category_id));

    // display_order follows list position, as the server will save it, so
    // the new order shows immediately instead of after the response.
    let cursor = 0;
    const reordered = categories
      .map((item) =>
        visibleIds.has(item.category_id) ? reorderedVisible[cursor++] : item,
      )
      .map((item, index) => ({ ...item, display_order: index }));

    setCategories(reordered);
    setSavingOrder(true);

    try {
      const { data } = await api.patch("/categories/order", {
        category_ids: reordered.map((item) => item.category_id),
      });

      if (data.categories) setCategories(data.categories);
    } catch (err) {
      setCategories(previous);
      toast.error(err.message || "Failed to save category order.");
    } finally {
      setSavingOrder(false);
    }
  }

  const openCreate = () => setDialog({});

  return (
    <>
      <CategoryToolbar
        section={section}
        onSectionChange={onSectionChange}
        actions={
          !isArchived && (
            <Button onClick={openCreate}>
              <Plus />
              New category
            </Button>
          )
        }
      >
        <TabBar
          variant="segmented"
          aria-label="Categories to show"
          value={view}
          onValueChange={setView}
          className="w-full sm:w-auto"
          items={[
            {
              value: "expense",
              icon: ArrowUpRight,
              label: <CountLabel label="Expenses" count={countOf("expense")} />,
            },
            {
              value: "income",
              icon: ArrowDownLeft,
              label: <CountLabel label="Income" count={countOf("income")} />,
            },
            {
              value: "archived",
              icon: Archive,
              label: (
                <CountLabel
                  label="Archived"
                  count={archivedCategories.length}
                />
              ),
            },
          ]}
        />
      </CategoryToolbar>

      {isArchived ? (
        <ArchivedList
          noun="category"
          plural="categories"
          onRestore={handleRestoreCategory}
          items={archivedCategories.map((category) => ({
            id: category.category_id,
            title: category.category_name,
            subtitle:
              category.category_type === "income" ? "Income" : "Expense",
            archivedAt: category.archived_at,
            source: category,
          }))}
        />
      ) : (
        <>
          {tree.length === 0 ? (
            <EmptyState
              icon={Tags}
              title={
                categories.length === 0
                  ? "No categories yet"
                  : `No ${filter} categories yet`
              }
              description={
                categories.length === 0
                  ? "Create your first category to organize your transactions."
                  : `Create a new ${filter} category to get started.`
              }
            >
              <Button onClick={openCreate}>
                <Plus />
                Create category
              </Button>
            </EmptyState>
          ) : (
            <SortableList
              items={tree}
              getId={(node) => node.category.category_id}
              disabled={savingOrder}
              onReorder={(from, to) => handleReorder(null, from, to)}
              className="space-y-3"
              renderItem={(node, sortable) => (
                <CategoryBlock
                  node={node}
                  {...sortable}
                  accountNames={accountNames}
                  budgetUsage={budgetUsage}
                  currency={settings?.currency ?? "CAD"}
                  onEdit={(item) => setDialog({ category: item })}
                  onArchive={handleArchiveCategory}
                  onReorder={handleReorder}
                  disabled={savingOrder}
                />
              )}
            />
          )}
        </>
      )}

      <CategoryDialog
        open={dialog !== null}
        category={editingCategory}
        categories={categories}
        accounts={accounts}
        onClose={() => setDialog(null)}
        onSave={handleSaveCategory}
      />
    </>
  );
}
