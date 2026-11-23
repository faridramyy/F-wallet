import { useEffect, useMemo, useState } from "react";
import { X, Wallet } from "lucide-react";

import {
  centsToInput,
  dollarsToCents,
  formatCurrency,
} from "../../lib/formatters";
import { useNotifications } from "../providers/useNotifications";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

function getInitialAmounts(budget) {
  const initialAmounts = {};

  for (const allocation of budget.allocations || []) {
    initialAmounts[allocation.category_id] = centsToInput(
      allocation.allocated_cents,
    );
  }

  return initialAmounts;
}

export function BudgetAllocationDialog({
  open,
  budget,
  categories,
  onClose,
  onSave,
}) {
  const { toast, confirm } = useNotifications();

  const [amounts, setAmounts] = useState({});
  const [saving, setSaving] = useState(false);

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.category_type === "expense" && !category.is_archived,
      ),
    [categories],
  );

  useEffect(() => {
    if (!open || !budget) return;

    setAmounts(getInitialAmounts(budget));
  }, [open, budget]);

  if (!open || !budget) return null;

  function updateAmount(categoryId, value) {
    setAmounts((current) => ({
      ...current,
      [categoryId]: value,
    }));
  }

  const totalCents = expenseCategories.reduce((total, category) => {
    const value = amounts[category.category_id] ?? "0";
    const cents = dollarsToCents(value);

    return total + BigInt(cents ?? 0);
  }, 0n);

  async function handleClose() {
    if (saving) return;

    const initialAmounts = getInitialAmounts(budget);

    const hasChanges =
      JSON.stringify(amounts) !== JSON.stringify(initialAmounts);

    if (!hasChanges) {
      onClose();
      return;
    }

    const confirmed = await confirm({
      title: "Discard changes?",
      description:
        "You have unsaved allocation changes. Are you sure you want to close?",
      confirmText: "Discard changes",
      cancelText: "Keep editing",
      variant: "destructive",
    });

    if (confirmed) {
      onClose();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const allocations = [];

    for (const category of expenseCategories) {
      const value = amounts[category.category_id] ?? "0";
      const cents = dollarsToCents(value);

      if (cents === null) {
        toast.error(
          `Enter a valid amount with no more than two decimal places for "${category.category_name}".`,
        );
        return;
      }

      if (cents > 0) {
        allocations.push({
          category_id: category.category_id,
          allocated_cents: cents,
        });
      }
    }

    try {
      setSaving(true);

      await onSave(allocations);

      toast.success("Budget allocations saved successfully.");

      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save allocations.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          handleClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              Manage category allocations
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {budget.name ||
                `${new Date(
                  budget.budget_year,
                  budget.budget_month - 1,
                ).toLocaleDateString("en-CA", {
                  month: "long",
                  year: "numeric",
                })} budget`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto p-6">
            {expenseCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
                <Wallet className="mx-auto size-8 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium text-foreground">
                  No active expense categories
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Create an expense category before adding budget allocations.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Enter the maximum amount you plan to spend in each category.
                  Leave a category at zero if you don't want to allocate a
                  budget to it.
                </p>

                {expenseCategories.map((category) => (
                  <div
                    key={category.category_id}
                    className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-4"
                  >
                    <div className="min-w-0">
                      <label
                        htmlFor={`allocation-${category.category_id}`}
                        className="block truncate text-sm font-medium text-foreground"
                      >
                        {category.category_name}
                      </label>
                    </div>

                    <div>
                      <label
                        className="sr-only"
                        htmlFor={`allocation-${category.category_id}`}
                      >
                        Allocation for {category.category_name}
                      </label>

                      <input
                        id={`allocation-${category.category_id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={amounts[category.category_id] ?? "0.00"}
                        onChange={(event) =>
                          updateAmount(category.category_id, event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
              <span className="text-sm font-medium text-foreground">
                Total allocated
              </span>

              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(Number(totalCents) / 100)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || expenseCategories.length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save allocations"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
