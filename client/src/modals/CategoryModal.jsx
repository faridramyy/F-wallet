import { useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";

export default function CategoryModal({ category, onClose }) {
  const { createCategory, updateCategory } = useApp();

  const isEditing = Boolean(category);

  const [form, setForm] = useState({
    name: category?.name || "",
    type: category?.type || "expense",
    monthlyBudget: category?.monthlyBudget || "",
    hourlyRate: category?.hourlyRate || "",
    overtimeRate: category?.overtimeRate || "",
    defaultAmount: category?.defaultAmount || "",
    // Categories saved before this existed have no entryMode, so fall
    // back to whether they carry an hourly rate.
    entryMode:
      category?.entryMode ||
      (Number(category?.hourlyRate) > 0 ? "hourly" : "fixed"),
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setError("");

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    const monthlyBudget = Number(form.monthlyBudget || 0);
    const hourlyRate = Number(form.hourlyRate || 0);
    const overtimeRate = Number(form.overtimeRate || 0);

    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
      setError("Budget must be a valid non-negative number.");
      return;
    }

    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      setError("Hourly rate must be a valid non-negative number.");
      return;
    }

    if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
      setError("Overtime rate must be a valid non-negative number.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        monthlyBudget,
        entryMode: form.entryMode,
        defaultAmount: Number(form.defaultAmount || 0),
        // Rates are only meaningful in hourly mode, so a category
        // switched to fixed does not keep stale ones around.
        hourlyRate: form.entryMode === "hourly" ? hourlyRate : 0,
        overtimeRate: form.entryMode === "hourly" ? overtimeRate : 0,
      };

      if (isEditing) {
        await updateCategory(category.id, payload);
      } else {
        await createCategory(payload);
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit category" : "Add category"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add category"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Category name" className="sm:col-span-2">
          <input
            className="input"
            value={form.name}
            onChange={set("name")}
            placeholder="Groceries"
            autoFocus
          />
        </Field>

        <Field label="Type">
          <select className="input" value={form.type} onChange={set("type")}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </Field>

        {form.type === "expense" ? (
          <Field label="Monthly budget">
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.monthlyBudget}
              onChange={set("monthlyBudget")}
              placeholder="0.00"
            />
          </Field>
        ) : (
          <>
            <Field
              label="How is this income entered?"
              className="sm:col-span-2"
            >
              <div className="entry-mode">
                <button
                  type="button"
                  className={`entry-mode-option ${form.entryMode === "fixed" ? "active" : ""}`}
                  onClick={() =>
                    setForm((current) => ({ ...current, entryMode: "fixed" }))
                  }
                >
                  <i className="fa-solid fa-money-bill" />
                  Fixed amount
                </button>

                <button
                  type="button"
                  className={`entry-mode-option ${form.entryMode === "hourly" ? "active" : ""}`}
                  onClick={() =>
                    setForm((current) => ({ ...current, entryMode: "hourly" }))
                  }
                >
                  <i className="fa-solid fa-clock" />
                  Hourly
                </button>
              </div>

              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                This sets how the transaction form opens for this category.
                Fixed suits bonuses, gifts and refunds. You can still switch
                modes on any individual transaction.
              </p>
            </Field>

            {form.entryMode === "fixed" ? (
              <Field label="Usual amount" className="sm:col-span-2">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.defaultAmount}
                  onChange={set("defaultAmount")}
                  placeholder="0.00"
                />

                <p className="mt-1 text-[11px] text-slate-400">
                  Optional. If this income is usually the same amount, it will
                  be filled in for you. Leave blank to type it each time.
                </p>
              </Field>
            ) : (
              <>
                <Field label="Rate per hour">
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.hourlyRate}
                    onChange={set("hourlyRate")}
                    placeholder="17.20"
                  />
                </Field>

                <Field label="Rate per overtime hour">
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.overtimeRate}
                    onChange={set("overtimeRate")}
                    placeholder="25.80"
                  />
                </Field>

                <p className="text-[11px] text-slate-400 sm:col-span-2">
                  Both rates are filled in for you when you log income in this
                  category.
                </p>
              </>
            )}
          </>
        )}

        {error && (
          <div className="sm:col-span-2">
            <p className="form-error">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
