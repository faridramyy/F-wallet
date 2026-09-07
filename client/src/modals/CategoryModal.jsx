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
    expectedIncome: category?.expectedIncome || "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setError("");

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    const monthlyBudget = Number(form.monthlyBudget || 0);
    const expectedIncome = Number(form.expectedIncome || 0);

    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
      setError("Budget must be a valid non-negative number.");
      return;
    }

    if (!Number.isFinite(expectedIncome) || expectedIncome < 0) {
      setError("Expected amount must be a valid non-negative number.");
      return;
    }

    setSaving(true);

    try {
      const payload = { name: form.name.trim(), type: form.type, monthlyBudget, expectedIncome };

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

          <button type="button" className="primary-button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add category"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Category name" className="sm:col-span-2">
          <input className="input" value={form.name} onChange={set("name")} placeholder="Groceries" autoFocus />
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
          <Field label="Expected per month">
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.expectedIncome}
              onChange={set("expectedIncome")}
              placeholder="0.00"
            />
          </Field>
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
