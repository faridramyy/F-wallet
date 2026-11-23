import { useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Plus,
  Wallet,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { CategoryCard } from "../components/categories/CategoryCard";
import { CategoryDialog } from "../components/categories/CategoryDialog";
import { BudgetDialog } from "../components/budgets/BudgetDialog";
import { BudgetAllocationDialog } from "../components/budgets/BudgetAllocationDialog";
import { BudgetCard } from "../components/budgets/BudgetCard";
import { apiRequest } from "../lib/api";
import { useNotifications } from "../components/providers/useNotifications";
import { useAppData } from "../components/providers/useAppData";

// Sort categories by their database display_order.
function sortByDisplayOrder(a, b) {
  return (
    (a.display_order ?? 0) - (b.display_order ?? 0) ||
    a.category_name.localeCompare(b.category_name)
  );
}

// Build a hierarchical category list.
// Children are displayed directly underneath their parent.
function getOrderedCategories(categories, categoryType) {
  const filtered = categories.filter(
    (category) => category.category_type === categoryType,
  );

  const categoryIds = new Set(filtered.map((category) => category.category_id));

  const childrenMap = new Map();

  filtered.forEach((category) => {
    const parentId =
      category.parent_category_id &&
      categoryIds.has(category.parent_category_id)
        ? category.parent_category_id
        : null;

    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }

    childrenMap.get(parentId).push(category);
  });

  childrenMap.forEach((children) => children.sort(sortByDisplayOrder));

  const result = [];
  const visited = new Set();

  function addCategory(category, depth = 0) {
    if (visited.has(category.category_id)) return;

    visited.add(category.category_id);

    result.push({
      ...category,
      depth,
    });

    const children = childrenMap.get(category.category_id) || [];

    children.forEach((child) => {
      addCategory(child, depth + 1);
    });
  }

  const roots = childrenMap.get(null) || [];

  roots.forEach((category) => addCategory(category));

  // Include any remaining categories defensively.
  [...filtered]
    .sort(sortByDisplayOrder)
    .forEach((category) => addCategory(category));

  return result;
}

function SortableCategoryCard({
  category,
  onEdit,
  onArchive,
  categories,
  accounts,
  disabled,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.category_id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
    marginLeft: `${category.depth * 24}px`,
  };

  const parent = categories.find(
    (item) => item.category_id === category.parent_category_id,
  );

  const account = accounts.find(
    (item) => item.account_id === category.default_account_id,
  );

  return (
    <CategoryCard
      category={category}
      parentName={parent?.category_name}
      accountName={account?.account_name}
      onEdit={onEdit}
      onArchive={onArchive}
      containerRef={setNodeRef}
      dragHandleRef={setActivatorNodeRef}
      dragHandleProps={{ ...attributes, ...listeners }}
      style={style}
      isDragging={isDragging}
    />
  );
}

export function CategoryPage() {
  const auth = useAuth();
  const { toast, confirm } = useNotifications();

  // Loaded once after sign-in (see AppDataProvider); no fetching in this page.
  const {
    categories,
    setCategories,
    archivedCategories,
    setArchivedCategories,
    accounts,
    budgets,
    setBudgets,
  } = useAppData();

  const [mainTab, setMainTab] = useState("categories");
  const [activeTab, setActiveTab] = useState("active");

  // Expenses are displayed by default.
  const [filter, setFilter] = useState("expense");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeDragCategory, setActiveDragCategory] = useState(null);

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Display categories in database order and maintain hierarchy.
  const visibleCategories = getOrderedCategories(categories, filter);

  // All budgets are already loaded; show the ones for the selected year.
  const sortedBudgets = budgets
    .filter((budget) => budget.budget_year === Number(selectedYear))
    .sort((a, b) => a.budget_month - b.budget_month);

  function openCreateDialog() {
    setEditingCategory(null);
    setDialogOpen(true);
  }

  function openEditDialog(category) {
    setEditingCategory(category);
    setDialogOpen(true);
  }

  // CategoryDialog handles its own success and error notifications.
  async function handleSaveCategory(data) {
    if (editingCategory) {
      const response = await apiRequest(
        `/categories/${editingCategory.category_id}`,
        auth,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );

      setCategories((current) =>
        current.map((item) =>
          item.category_id === editingCategory.category_id
            ? response.data.category
            : item,
        ),
      );
    } else {
      const response = await apiRequest("/categories", auth, {
        method: "POST",
        body: JSON.stringify(data),
      });

      setCategories((current) => [...current, response.data.category]);
    }
  }

  async function handleArchiveCategory(category) {
    const confirmed = await confirm({
      title: "Archive category?",
      description: `Are you sure you want to archive "${category.category_name}"? It will no longer appear in your active categories.`,
      confirmText: "Archive category",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const response = await apiRequest(
        `/categories/${category.category_id}`,
        auth,
        { method: "DELETE" },
      );

      setCategories((current) =>
        current.filter((item) => item.category_id !== category.category_id),
      );

      // Newest archived first, matching the order the server returns.
      setArchivedCategories((current) => [response.data.category, ...current]);

      toast.success("Category archived.");
    } catch (err) {
      toast.error(err.message || "Unable to archive category.");
    }
  }

  async function handleRestoreCategory(category) {
    try {
      const response = await apiRequest(
        `/categories/${category.category_id}/restore`,
        auth,
        { method: "POST" },
      );

      setArchivedCategories((current) =>
        current.filter((item) => item.category_id !== category.category_id),
      );

      setCategories((current) => [...current, response.data.category]);

      toast.success("Category restored.");
    } catch (err) {
      toast.error(err.message || "Unable to restore category.");
    }
  }

  function handleDragStart(event) {
    const category = categories.find(
      (item) => item.category_id === event.active.id,
    );

    setActiveDragCategory(category || null);
  }

  function handleDragCancel() {
    setActiveDragCategory(null);
  }

  async function handleDragEnd(event) {
    setActiveDragCategory(null);

    const { active, over } = event;

    if (!over || active.id === over.id || savingOrder) return;

    const oldIndex = visibleCategories.findIndex(
      (item) => item.category_id === active.id,
    );

    const newIndex = visibleCategories.findIndex(
      (item) => item.category_id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const previousCategories = categories;

    const reorderedVisible = arrayMove(visibleCategories, oldIndex, newIndex);

    // Keep the other category type's order unchanged.
    const reorderedIds = new Set(
      reorderedVisible.map((item) => item.category_id),
    );

    let cursor = 0;

    const reorderedCategories = categories.map((item) =>
      reorderedIds.has(item.category_id) ? reorderedVisible[cursor++] : item,
    );

    setCategories(reorderedCategories);
    setSavingOrder(true);

    try {
      const response = await apiRequest("/categories/order", auth, {
        method: "PATCH",
        body: JSON.stringify({
          category_ids: reorderedCategories.map((item) => item.category_id),
        }),
      });

      if (response.data.categories) {
        setCategories(response.data.categories);
      }

      toast.success("Category order saved.");
    } catch (err) {
      console.error("Failed to save category order:", err);

      setCategories(previousCategories);

      toast.error(err.message || "Failed to save category order.");
    } finally {
      setSavingOrder(false);
    }
  }

  function openCreateBudgetDialog() {
    setEditingBudget(null);
    setBudgetDialogOpen(true);
  }

  function openEditBudgetDialog(budget) {
    setEditingBudget(budget);
    setBudgetDialogOpen(true);
  }

  // BudgetDialog handles its own success and error notifications.
  async function handleSaveBudget(data) {
    if (editingBudget) {
      const response = await apiRequest(
        `/budgets/${editingBudget.budget_id}`,
        auth,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );

      setBudgets((current) =>
        current.map((item) =>
          item.budget_id === editingBudget.budget_id
            ? response.data.budget
            : item,
        ),
      );
    } else {
      const response = await apiRequest("/budgets", auth, {
        method: "POST",
        body: JSON.stringify(data),
      });

      setBudgets((current) => [...current, response.data.budget]);
    }
  }

  async function handleDeleteBudget(budget) {
    const monthLabel = new Date(
      budget.budget_year,
      budget.budget_month - 1,
      1,
    ).toLocaleDateString("en-CA", {
      month: "long",
      year: "numeric",
    });

    const confirmed = await confirm({
      title: "Delete monthly budget?",
      description: `Are you sure you want to delete the budget for ${monthLabel}? Its category allocations will also be deleted.`,
      confirmText: "Delete budget",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/budgets/${budget.budget_id}`, auth, {
        method: "DELETE",
      });

      setBudgets((current) =>
        current.filter((item) => item.budget_id !== budget.budget_id),
      );

      toast.success("Budget deleted.");
    } catch (err) {
      toast.error(err.message || "Unable to delete budget.");
    }
  }

  function openAllocationDialog(budget) {
    setSelectedBudget(budget);
    setAllocationDialogOpen(true);
  }

  // BudgetAllocationDialog handles its own success and error notifications.
  async function handleSaveAllocations(allocations) {
    if (!selectedBudget) return;

    const response = await apiRequest(
      `/budgets/${selectedBudget.budget_id}/allocations`,
      auth,
      {
        method: "PUT",
        body: JSON.stringify({ allocations }),
      },
    );

    setBudgets((current) =>
      current.map((item) =>
        item.budget_id === selectedBudget.budget_id
          ? response.data.budget
          : item,
      ),
    );
  }

  const incomeCount = categories.filter(
    (item) => item.category_type === "income",
  ).length;

  const expenseCount = categories.filter(
    (item) => item.category_type === "expense",
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Categories & Budgets
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Organize your income and expenses and manage your monthly budgets.
          </p>
        </div>

        {mainTab === "categories" && activeTab === "active" && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            New category
          </Button>
        )}

        {mainTab === "budgets" && (
          <Button onClick={openCreateBudgetDialog} className="gap-2">
            <Plus className="size-4" />
            New budget
          </Button>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setMainTab("categories")}
          className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            mainTab === "categories"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Categories
        </button>

        <button
          type="button"
          onClick={() => setMainTab("budgets")}
          className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            mainTab === "budgets"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="size-4" />
          Budgets
        </button>
      </div>

      {mainTab === "categories" ? (
        <>
          {/* Category statistics */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total categories</p>

              <p className="mt-2 text-2xl font-semibold text-foreground">
                {categories.length}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Income categories</p>

              <p className="mt-2 text-2xl font-semibold text-chart-1">
                {incomeCount}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Expense categories
              </p>

              <p className="mt-2 text-2xl font-semibold text-chart-5">
                {expenseCount}
              </p>
            </div>
          </div>

          {/* Active / archived tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Active categories
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("archived")}
              className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "archived"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="size-4" />
              Archived
            </button>
          </div>

          {activeTab === "active" ? (
            <>
              {/* Category type filters */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "expense", label: "Expenses" },
                    { value: "income", label: "Income" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        filter === item.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {savingOrder && (
                  <span className="text-xs text-muted-foreground">
                    Saving order...
                  </span>
                )}
              </div>

              {visibleCategories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                  <h3 className="text-sm font-medium text-foreground">
                    {categories.length === 0
                      ? "No categories yet"
                      : `No ${filter} categories yet`}
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {categories.length === 0
                      ? "Create your first category to organize your transactions."
                      : `Create a new ${filter} category to get started.`}
                  </p>

                  <Button onClick={openCreateDialog} className="mt-4 gap-2">
                    <Plus className="size-4" />
                    Create category
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragCancel={handleDragCancel}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleCategories.map((item) => item.category_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {visibleCategories.map((category) => (
                        <SortableCategoryCard
                          key={category.category_id}
                          category={category}
                          categories={categories}
                          accounts={accounts}
                          onEdit={openEditDialog}
                          onArchive={handleArchiveCategory}
                          disabled={savingOrder}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  <DragOverlay>
                    {activeDragCategory ? (
                      <div className="rotate-1 shadow-xl">
                        <CategoryCard
                          category={activeDragCategory}
                          onEdit={() => {}}
                          onArchive={() => {}}
                          isDragging
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Archived categories can be restored here.
              </p>

              {archivedCategories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                  <Archive className="mx-auto size-8 text-muted-foreground" />

                  <h3 className="mt-3 text-sm font-medium text-foreground">
                    No archived categories
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Categories you archive will appear here.
                  </p>
                </div>
              ) : (
                archivedCategories.map((category) => (
                  <div
                    key={category.category_id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {category.category_name}
                      </p>

                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {category.category_type}
                        {category.archived_at
                          ? ` · Archived ${new Date(
                              category.archived_at,
                            ).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleRestoreCategory(category)}
                    >
                      <ArchiveRestore className="size-4" />
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        /* Budgets */
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <label
                htmlFor="budget-year"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Budget year
              </label>

              <input
                id="budget-year"
                type="number"
                min="2000"
                max="9999"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary sm:w-40"
              />
            </div>
          </div>

          {sortedBudgets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />

              <h3 className="mt-3 text-sm font-medium text-foreground">
                No budgets for {selectedYear}
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Create a monthly budget to start planning your expenses.
              </p>

              <Button onClick={openCreateBudgetDialog} className="mt-4 gap-2">
                <Plus className="size-4" />
                Create monthly budget
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedBudgets.map((budget) => (
                <BudgetCard
                  key={budget.budget_id}
                  budget={budget}
                  onEdit={openEditBudgetDialog}
                  onManageAllocations={openAllocationDialog}
                  onDelete={handleDeleteBudget}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CategoryDialog
        open={dialogOpen}
        category={editingCategory}
        categories={categories}
        accounts={accounts}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveCategory}
      />

      <BudgetDialog
        open={budgetDialogOpen}
        budget={editingBudget}
        onClose={() => setBudgetDialogOpen(false)}
        onSave={handleSaveBudget}
      />

      <BudgetAllocationDialog
        open={allocationDialogOpen}
        budget={selectedBudget}
        categories={categories}
        onClose={() => setAllocationDialogOpen(false)}
        onSave={handleSaveAllocations}
      />
    </div>
  );
}
