import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { useNotifications } from "../providers/useNotifications";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { getCurrentYearMonth } from "../../lib/formatters";
import { MONTH_OPTIONS } from "../../lib/options";

function getInitialForm(budget) {
  const { year, month } = getCurrentYearMonth();

  return {
    budget_year: String(budget?.budget_year ?? year),
    budget_month: String(budget?.budget_month ?? month),
    name: budget?.name ?? "",
  };
}

function BudgetDialogContent({ budget, onClose, onSave }) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() => getInitialForm(budget));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(budget);

  const bind = (name) => ({
    id: `budget_${name}`,
    value: form[name],
    onChange: (event) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
      setError("");
    },
  });

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "budget",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const year = Number(form.budget_year);
    const month = Number(form.budget_month);

    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
      return setError("Enter a valid year between 2000 and 9999.");
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return setError("Select a valid month.");
    }

    setSaving(true);

    try {
      await onSave({
        budget_year: year,
        budget_month: month,
        name: form.name.trim() || null,
      });

      toast.success(isEditing ? "Budget updated." : "Budget created.");
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save budget.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title={isEditing ? "Edit budget" : "Create monthly budget"}
      description="Set up a budget for a specific month."
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Create budget"}
      saving={saving}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Month" htmlFor="budget_budget_month">
          <Select
            id="budget_budget_month"
            value={form.budget_month}
            options={MONTH_OPTIONS}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, budget_month: value }))
            }
          />
        </Field>

        <Field label="Year" htmlFor="budget_budget_year">
          <Input
            {...bind("budget_year")}
            type="number"
            min="2000"
            max="9999"
            required
          />
        </Field>
      </div>

      <Field label="Budget name (optional)" htmlFor="budget_name">
        <Input
          {...bind("name")}
          maxLength={100}
          placeholder="e.g. Monthly household budget"
        />
      </Field>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form built
// from the props.
export function BudgetDialog(props) {
  if (!props.open) return null;

  return <BudgetDialogContent key={props.budget?.budget_id} {...props} />;
}
