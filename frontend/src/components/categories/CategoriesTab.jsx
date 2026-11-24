import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  Plus,
  Tags,
} from "lucide-react";

import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { StatCard, StatGrid } from "../ui/stat-card";
import { TabBar } from "../ui/tab-bar";
import { ArchivedList } from "../common/ArchivedList";
import { PageIntro } from "../common/PageIntro";
import { SortableList } from "../common/SortableList";
import { CategoryCard } from "./CategoryCard";
import { CategoryDialog } from "./CategoryDialog";
import { useNotifications } from "../providers/useNotifications";
import { useAppData } from "../providers/useAppData";
import { createApi } from "../../lib/api";
import { removeById, replaceById } from "../../lib/collections";
import { getMonthContext, spendingByCategory } from "../../lib/analytics";
import { formatCents } from "../../lib/formatters";

const STATUS_TABS = [
  { value: "active", label: "Active categories" },
  { value: "archived", label: "Archived", icon: Archive },
];

const TYPE_FILTERS = [
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
];

const byDisplayOrder = (a, b) =>
  (a.display_order ?? 0) - (b.display_order ?? 0) ||
  a.category_name.localeCompare(b.category_name);

// Categories of one type in display order, each child placed directly under
// its parent and tagged with its nesting `depth`.
function getOrderedCategories(categories, categoryType) {
  const ofType = categories.filter((c) => c.category_type === categoryType);
  const ids = new Set(ofType.map((c) => c.category_id));
  const childrenOf = new Map();

  for (const category of ofType) {
    const parentId = ids.has(category.parent_category_id)
      ? category.parent_category_id
      : null;

    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId).push(category);
  }

  const result = [];
  const visited = new Set();

  const visit = (category, depth) => {
    if (visited.has(category.category_id)) return;

    visited.add(category.category_id);
    result.push({ ...category, depth });

    (childrenOf.get(category.category_id) ?? [])
      .sort(byDisplayOrder)
      .forEach((child) => visit(child, depth + 1));
  };

  (childrenOf.get(null) ?? []).sort(byDisplayOrder).forEach((c) => visit(c, 0));

  // Defensive: anything left over (e.g. a parent cycle) is shown at the top level.
  [...ofType].sort(byDisplayOrder).forEach((c) => visit(c, 0));

  return result;
}

export function CategoriesTab() {
  const api = createApi(useAuth());
  const { toast, confirm } = useNotifications();
  const {
    categories,
    setCategories,
    archivedCategories,
    setArchivedCategories,
    accounts,
    transactions,
    settings,
  } = useAppData();

  const [status, setStatus] = useState("active");
  const [filter, setFilter] = useState("expense");
  // null = closed, {} = creating, { category } = editing
  const [dialog, setDialog] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const editingCategory = dialog?.category ?? null;
  const visibleCategories = getOrderedCategories(categories, filter);

  // Looked up once per render instead of once per card.
  const categoryNames = new Map(
    categories.map((c) => [c.category_id, c.category_name]),
  );
  const accountNames = new Map(
    accounts.map((a) => [a.account_id, a.account_name]),
  );

  const countOf = (type) =>
    categories.filter((c) => c.category_type === type).length;
  const subcategoryCount = categories.filter((c) =>
    categoryNames.has(c.parent_category_id),
  ).length;
  const topCategory = spendingByCategory(
    transactions,
    getMonthContext().current.key,
  ).find((item) => item.id !== "other");

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

  // Optimistic reorder within the visible type; the other type keeps its
  // positions. Rolls back if saving fails.
  async function handleReorder(from, to) {
    const previous = categories;
    const reorderedVisible = arrayMove(visibleCategories, from, to);
    const visibleIds = new Set(reorderedVisible.map((c) => c.category_id));

    let cursor = 0;
    const reordered = categories.map((item) =>
      visibleIds.has(item.category_id) ? reorderedVisible[cursor++] : item,
    );

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
      <PageIntro description="Organize your income and expenses.">
        {status === "active" && (
          <Button onClick={openCreate}>
            <Plus />
            New category
          </Button>
        )}
      </PageIntro>

      <StatGrid>
        <StatCard
          icon={Tags}
          label="Categories"
          value={categories.length}
          description={`${subcategoryCount} sub-categor${subcategoryCount === 1 ? "y" : "ies"}`}
        />
        <StatCard
          icon={ArrowDownLeft}
          tone="income"
          label="Income categories"
          value={countOf("income")}
          description="For money coming in"
        />
        <StatCard
          icon={ArrowUpRight}
          tone="expense"
          label="Expense categories"
          value={countOf("expense")}
          description="For money going out"
        />
        <StatCard
          icon={Flame}
          tone="warning"
          label="Top category"
          value={topCategory?.name ?? "—"}
          description={
            topCategory
              ? `${formatCents(topCategory.cents, settings?.currency ?? "CAD")} spent this month`
              : "No expenses yet this month"
          }
        />
      </StatGrid>

      <TabBar value={status} onValueChange={setStatus} items={STATUS_TABS} />

      {status === "archived" ? (
        <ArchivedList
          noun="category"
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
          <TabBar
            variant="pill"
            aria-label="Category type"
            value={filter}
            onValueChange={setFilter}
            items={TYPE_FILTERS}
          />

          {visibleCategories.length === 0 ? (
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
              items={visibleCategories}
              getId={(category) => category.category_id}
              disabled={savingOrder}
              onReorder={handleReorder}
              className="space-y-3"
              renderItem={(category, sortable) => (
                <CategoryCard
                  category={category}
                  parentName={categoryNames.get(category.parent_category_id)}
                  accountName={accountNames.get(category.default_account_id)}
                  onEdit={(item) => setDialog({ category: item })}
                  onArchive={handleArchiveCategory}
                  {...sortable}
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
