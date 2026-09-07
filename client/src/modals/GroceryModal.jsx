import { useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { today } from "../lib/format";

export default function GroceryModal({ grocery, onClose }) {
  const { createGrocery, updateGrocery } = useApp();

  const isEditing = Boolean(grocery);

  const [form, setForm] = useState({
    item: grocery?.item || "",
    price: grocery?.price ?? "",
    store: grocery?.store === "Unknown store" ? "" : grocery?.store || "",
    date: grocery?.date || today(),
    description: grocery?.description || "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setError("");

    if (!form.item.trim()) {
      setError("Item name is required.");
      return;
    }

    const price = Number(form.price || 0);

    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a valid number.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        item: form.item.trim(),
        price,
        store: form.store.trim() || "Unknown store",
        date: form.date || today(),
        description: form.description.trim(),
      };

      if (isEditing) {
        await updateGrocery(grocery.id, payload);
      } else {
        await createGrocery(payload);
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit price entry" : "Log a price"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="primary-button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add price"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Item" className="sm:col-span-2">
          <input className="input" value={form.item} onChange={set("item")} placeholder="Milk, 4L" autoFocus />
        </Field>

        <Field label="Price">
          <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={set("price")} placeholder="0.00" />
        </Field>

        <Field label="Store">
          <input className="input" value={form.store} onChange={set("store")} placeholder="No Frills" />
        </Field>

        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={set("date")} />
        </Field>

        <Field label="Note" className="sm:col-span-2">
          <input className="input" value={form.description} onChange={set("description")} placeholder="On sale until Sunday" />
        </Field>

        {error && (
          <div className="sm:col-span-2">
            <p className="form-error">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
