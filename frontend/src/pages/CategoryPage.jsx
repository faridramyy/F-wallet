import { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  Tags,
  Wallet,
  RefreshCw,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { CategoryCard } from "../components/categories/CategoryCard";
import { CategoryDialog } from "../components/categories/CategoryDialog";
import { apiRequest } from "../lib/api";
import { useNotifications } from "../components/providers/useNotifications";

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

  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeDragCategory, setActiveDragCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryResponse, accountResponse] = await Promise.all([
        apiRequest("/categories", auth),
        apiRequest("/accounts", auth),
      ]);

      setCategories(categoryResponse.data.categories || []);
      setAccounts(
        (accountResponse.data.accounts || []).filter(
          (account) => !account.is_archived,
        ),
      );
    } catch (err) {
      setError(err.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadArchivedCategories = useCallback(async () => {
    setLoadingArchived(true);

    try {
      const response = await apiRequest("/categories/archived", auth);
      setArchivedCategories(response.data.categories || []);
    } catch (err) {
      toast.error(err.message || "Unable to load archived categories.");
    } finally {
      setLoadingArchived(false);
    }
  }, [auth, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "archived") {
      loadArchivedCategories();
    }
  }, [activeTab, loadArchivedCategories]);

  const visibleCategories = useMemo(() => {
    if (filter === "all") return categories;

    return categories.filter((category) => category.category_type === filter);
  }, [categories, filter]);

  function openCreateDialog() {
    setEditingCategory(null);
    setDialogOpen(true);
  }

  function openEditDialog(category) {
    setEditingCategory(category);
    setDialogOpen(true);
  }

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

      toast.success("Category updated.");
    } else {
      const response = await apiRequest("/categories", auth, {
        method: "POST",
        body: JSON.stringify(data),
      });

      setCategories((current) => [...current, response.data.category]);
      toast.success("Category created.");
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
      await apiRequest(`/categories/${category.category_id}`, auth, {
        method: "DELETE",
      });

      setCategories((current) =>
        current.filter((item) => item.category_id !== category.category_id),
      );

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

    const oldIndex = categories.findIndex(
      (item) => item.category_id === active.id,
    );
    const newIndex = categories.findIndex(
      (item) => item.category_id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const previousCategories = categories;
    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);

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

  const incomeCount = categories.filter(
    (item) => item.category_type === "income",
  ).length;
  const expenseCount = categories.filter(
    (item) => item.category_type === "expense",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Categories & Budgets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your income and expenses and manage your monthly budgets.
          </p>
        </div>

        {activeTab === "active" && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            New category
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tags className="size-4" />
            <span className="text-xs">Total categories</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {categories.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Income categories</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {incomeCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Expense categories</p>
          <p className="mt-2 text-2xl font-semibold text-orange-600">
            {expenseCount}
          </p>
        </div>
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All" },
                { value: "income", label: "Income" },
                { value: "expense", label: "Expenses" },
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

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading categories...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={loadData}
              >
                <RefreshCw className="size-4" />
                Try again
              </Button>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Tags className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-medium text-foreground">
                {categories.length === 0
                  ? "No categories yet"
                  : "No categories in this filter"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {categories.length === 0
                  ? "Create your first category to organize your transactions."
                  : "Try selecting a different category type."}
              </p>
              {categories.length === 0 && (
                <Button onClick={openCreateDialog} className="mt-4 gap-2">
                  <Plus className="size-4" />
                  Create category
                </Button>
              )}
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
                      disabled={savingOrder || filter !== "all"}
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

          {filter !== "all" && categories.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Switch to All to reorder categories.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Archived categories can be restored here.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={loadArchivedCategories}
              disabled={loadingArchived}
            >
              <RefreshCw
                className={`size-3.5 ${loadingArchived ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {loadingArchived ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading archived categories...
            </div>
          ) : archivedCategories.length === 0 ? (
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
                      ? ` · Archived ${new Date(category.archived_at).toLocaleDateString()}`
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

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">
            Monthly budgets
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Budget management will be added to this page after Categories is
          connected and tested.
        </p>
      </div>

      <CategoryDialog
        open={dialogOpen}
        category={editingCategory}
        categories={categories}
        accounts={accounts}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
