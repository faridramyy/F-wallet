import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { IconButton } from "../ui/icon-button";
import { BudgetCard } from "./BudgetCard";
import { CategoryToolbar } from "../categories/CategoryToolbar";
import { BudgetDialog } from "./BudgetDialog";
import { BudgetAllocationDialog } from "./BudgetAllocationDialog";
import { useNotifications } from "../providers/useNotifications";
import { useAppData } from "../providers/useAppData";
import { createApi } from "../../lib/api";
import { removeById, replaceById } from "../../lib/collections";
import { formatMonthYear } from "../../lib/formatters";

// The Budgets section: a year stepper and the year's monthly budgets.
export function BudgetsTab({ section, onSectionChange }) {
  const api = createApi(useAuth());
  const { toast, confirm } = useNotifications();
  const { budgets, setBudgets, categories } = useAppData();

  const [year, setYear] = useState(String(new Date().getFullYear()));
  // null = closed, {} = creating, { budget } = editing
  const [budgetDialog, setBudgetDialog] = useState(null);
  const [allocationBudget, setAllocationBudget] = useState(null);

  const editingBudget = budgetDialog?.budget ?? null;

  // All budgets are already loaded; show the selected year's, by month.
  const yearBudgets = budgets
    .filter((budget) => budget.budget_year === Number(year))
    .sort((a, b) => a.budget_month - b.budget_month);

  const saveBudgetLocally = (budget) =>
    setBudgets((current) => replaceById(current, "budget_id", budget));

  // The dialogs show their own success/error messages; errors are rethrown.
  async function handleSaveBudget(body) {
    if (editingBudget) {
      const { data } = await api.patch(
        `/budgets/${editingBudget.budget_id}`,
        body,
      );
      saveBudgetLocally(data.budget);
    } else {
      const { data } = await api.post("/budgets", body);
      setBudgets((current) => [...current, data.budget]);
    }
  }

  async function handleSaveAllocations(allocations) {
    const { data } = await api.put(
      `/budgets/${allocationBudget.budget_id}/allocations`,
      { allocations },
    );
    saveBudgetLocally(data.budget);
  }

  async function handleDeleteBudget(budget) {
    const monthLabel = formatMonthYear(budget.budget_year, budget.budget_month);

    const confirmed = await confirm({
      title: "Delete monthly budget?",
      description: `Are you sure you want to delete the budget for ${monthLabel}? Its category allocations will also be deleted.`,
      confirmText: "Delete budget",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/budgets/${budget.budget_id}`);
      setBudgets((current) =>
        removeById(current, "budget_id", budget.budget_id),
      );
      toast.success("Budget deleted.");
    } catch (err) {
      toast.error(err.message || "Unable to delete budget.");
    }
  }

  const openCreate = () => setBudgetDialog({});

  return (
    <>
      <CategoryToolbar
        section={section}
        onSectionChange={onSectionChange}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New budget
          </Button>
        }
      >
        <div
          role="group"
          aria-label="Budget year"
          className="flex items-center rounded-lg bg-muted p-1"
        >
          <IconButton
            icon={ChevronLeft}
            label="Previous year"
            onClick={() => setYear((y) => String(Number(y) - 1))}
          />
          <span
            aria-live="polite"
            className="min-w-14 px-1 text-center text-sm font-semibold tabular-nums"
          >
            {year}
          </span>
          <IconButton
            icon={ChevronRight}
            label="Next year"
            onClick={() => setYear((y) => String(Number(y) + 1))}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {yearBudgets.length} {yearBudgets.length === 1 ? "budget" : "budgets"}
        </span>
      </CategoryToolbar>

      {yearBudgets.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`No budgets for ${year}`}
          description="Create a monthly budget to start planning your expenses."
        >
          <Button onClick={openCreate}>
            <Plus />
            Create monthly budget
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {yearBudgets.map((budget) => (
            <BudgetCard
              key={budget.budget_id}
              budget={budget}
              onEdit={(item) => setBudgetDialog({ budget: item })}
              onManageAllocations={setAllocationBudget}
              onDelete={handleDeleteBudget}
            />
          ))}
        </div>
      )}

      <BudgetDialog
        open={budgetDialog !== null}
        budget={editingBudget}
        onClose={() => setBudgetDialog(null)}
        onSave={handleSaveBudget}
      />

      <BudgetAllocationDialog
        open={allocationBudget !== null}
        budget={allocationBudget}
        categories={categories}
        onClose={() => setAllocationBudget(null)}
        onSave={handleSaveAllocations}
      />
    </>
  );
}
