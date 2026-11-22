import { useEffect, useMemo, useState } from "react";
import { X, Wallet } from "lucide-react";
import { formatCurrency } from "../../lib/formatters";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function centsToInput(value) {
  try {
    const cents = BigInt(value ?? 0);
    const dollars = cents / 100n;
    const remainder = String(cents % 100n).padStart(2, "0");

    return `${dollars}.${remainder}`;
  } catch {
    return "0.00";
  }
}

function dollarsToCents(value) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const [dollars, fraction = ""] = normalized.split(".");
  const cents = BigInt(dollars) * 100n + BigInt(fraction.padEnd(2, "0") || "0");

  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(cents);
}

export function BudgetAllocationDialog({
  open,
  budget,
  categories,
  onClose,
  onSave,
}) {
  const [amounts, setAmounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const expenseCategories = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.category_type === "expense" && !category.is_archived,
        )
        .sort((a, b) => a.category_name.localeCompare(b.category_name)),
    [categories],
  );

  useEffect(() => {
    if (!open || !budget) return;

    const initialAmounts = {};

    for (const allocation of budget.allocations || []) {
      initialAmounts[allocation.category_id] = centsToInput(
        allocation.allocated_cents,
      );
    }

    setAmounts(initialAmounts);
    setError("");
  }, [open, budget]);

  if (!open || !budget) return null;

  function updateAmount(categoryId, value) {
    setAmounts((current) => ({
      ...current,
      [categoryId]: value,
    }));

    setError("");
  }

  const totalCents = expenseCategories.reduce((total, category) => {
    const value = amounts[category.category_id] ?? "0";
    const cents = dollarsToCents(value);

    return total + BigInt(cents ?? 0);
  }, 0n);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const allocations = [];

    for (const category of expenseCategories) {
      const value = amounts[category.category_id] ?? "0";
      const cents = dollarsToCents(value);

      if (cents === null) {
        setError(
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
      setError("");

      await onSave(allocations);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save allocations.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl">
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
            onClick={onClose}
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

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
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
