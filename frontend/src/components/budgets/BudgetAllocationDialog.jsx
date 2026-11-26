import { useState } from "react";
import { Wallet } from "lucide-react";

import { FormDialog } from "../common/FormDialog";
import { EmptyState } from "../ui/empty-state";
import { Input } from "../ui/input";
import { useNotifications } from "../providers/useNotifications";
import { useAppData } from "../providers/useAppData";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import {
  centsToInput,
  dollarsToCents,
  formatCents,
  formatMonthYear,
} from "../../lib/formatters";

function getInitialAmounts(budget) {
  return Object.fromEntries(
    (budget.allocations ?? []).map((allocation) => [
      allocation.category_id,
      centsToInput(allocation.allocated_cents),
    ]),
  );
}

function BudgetAllocationDialogContent({
  budget,
  categories,
  onClose,
  onSave,
}) {
  const { toast, confirm } = useNotifications();
  const { currency } = useAppData();

  const [initialAmounts] = useState(() => getInitialAmounts(budget));
  const [amounts, setAmounts] = useState(initialAmounts);
  const [saving, setSaving] = useState(false);

  const expenseCategories = categories.filter(
    (category) => category.category_type === "expense" && !category.is_archived,
  );

  const centsFor = (category) =>
    dollarsToCents(amounts[category.category_id] ?? "0");

  const totalCents = expenseCategories.reduce(
    (total, category) => total + (centsFor(category) ?? 0),
    0,
  );

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(amounts, initialAmounts),
      confirm,
      onClose,
      noun: "allocation",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const allocations = [];

    for (const category of expenseCategories) {
      const cents = centsFor(category);

      if (cents === null) {
        return toast.error(
          `Enter a valid amount with no more than two decimal places for "${category.category_name}".`,
        );
      }

      if (cents > 0) {
        allocations.push({
          category_id: category.category_id,
          allocated_cents: cents,
        });
      }
    }

    setSaving(true);

    try {
      await onSave(allocations);
      toast.success("Budget allocations saved.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save allocations.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      size="lg"
      title="Manage category allocations"
      description={
        budget.name ||
        `${formatMonthYear(budget.budget_year, budget.budget_month)} budget`
      }
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel="Save allocations"
      submitDisabled={expenseCategories.length === 0}
      saving={saving}
    >
      {expenseCategories.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No active expense categories"
          description="Create an expense category before adding budget allocations."
          className="py-10"
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Enter the maximum amount you plan to spend in each category. Leave a
            category at zero if you don't want to allocate a budget to it.
          </p>

          {expenseCategories.map((category) => {
            const id = `allocation-${category.category_id}`;

            return (
              <div
                key={category.category_id}
                className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-4"
              >
                <label htmlFor={id} className="truncate text-sm font-medium">
                  {category.category_name}
                </label>

                <Input
                  id={id}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={amounts[category.category_id] ?? "0.00"}
                  onChange={(event) => {
                    setAmounts((current) => ({
                      ...current,
                      [category.category_id]: event.target.value,
                    }));
                  }}
                />
              </div>
            );
          })}
        </>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
        <span className="text-sm font-medium">Total allocated</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatCents(totalCents, currency)}
        </span>
      </div>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form built
// from the props.
export function BudgetAllocationDialog(props) {
  if (!props.open || !props.budget) return null;

  return (
    <BudgetAllocationDialogContent key={props.budget.budget_id} {...props} />
  );
}
