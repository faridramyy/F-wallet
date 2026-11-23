import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useNotifications } from "../providers/useNotifications";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function getCurrentPeriod() {
  const now = new Date();

  return {
    budget_year: now.getFullYear(),
    budget_month: now.getMonth() + 1,
  };
}

function getInitialForm(budget) {
  if (budget) {
    return {
      budget_year: String(budget.budget_year),
      budget_month: String(budget.budget_month),
      name: budget.name || "",
    };
  }

  const period = getCurrentPeriod();

  return {
    budget_year: String(period.budget_year),
    budget_month: String(period.budget_month),
    name: "",
  };
}

export function BudgetDialog({ open, budget = null, onClose, onSave }) {
  const { toast, confirm } = useNotifications();

  const [form, setForm] = useState(() => getInitialForm(budget));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(getInitialForm(budget));
  }, [open, budget]);

  if (!open) return null;

  const isEditing = Boolean(budget);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleClose() {
    if (saving) return;

    const initialForm = getInitialForm(budget);

    const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

    if (!hasChanges) {
      onClose();
      return;
    }

    const confirmed = await confirm({
      title: "Discard changes?",
      description:
        "You have unsaved budget changes. Are you sure you want to close?",
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

    const year = Number(form.budget_year);
    const month = Number(form.budget_month);

    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
      toast.error("Enter a valid year between 2000 and 9999.");
      return;
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      toast.error("Select a valid month.");
      return;
    }

    try {
      setSaving(true);

      await onSave({
        budget_year: year,
        budget_month: month,
        name: form.name.trim() || null,
      });

      toast.success(
        isEditing
          ? "Budget updated successfully."
          : "Budget created successfully.",
      );

      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save budget.");
    } finally {
      setSaving(false);
    }
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          handleClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? "Edit budget" : "Create monthly budget"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Set up a budget for a specific month.
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
          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Month</label>

                <select
                  value={form.budget_month}
                  onChange={(event) =>
                    updateField("budget_month", event.target.value)
                  }
                  className={inputClass}
                >
                  {monthNames.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Year</label>

                <input
                  type="number"
                  min="2000"
                  max="9999"
                  required
                  value={form.budget_year}
                  onChange={(event) =>
                    updateField("budget_year", event.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Budget name (optional)</label>

              <input
                type="text"
                maxLength={100}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="e.g. Monthly household budget"
                className={inputClass}
              />
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
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
