import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestInput, distinctValues } from "../components/SuggestInput";
import { today } from "../lib/format";

const PRICE_TYPES = [
  { value: "normal", label: "Regular", icon: "fa-tag" },
  { value: "offer", label: "Offer", icon: "fa-percent" },
  { value: "reduced", label: "Reduced", icon: "fa-arrow-down" },
];

export default function GroceryModal({ grocery, onClose }) {
  const { groceries, createGrocery, updateGrocery } = useApp();

  const isEditing = Boolean(grocery);

  const [form, setForm] = useState({
    item: grocery?.item || "",
    price: grocery?.price ?? "",
    store: grocery?.store === "Unknown store" ? "" : grocery?.store || "",
    date: grocery?.date || today(),
    description: grocery?.description || "",
    // Entries saved before this existed have no priceType, which is
    // correct: they were regular prices.
    priceType: grocery?.priceType || "normal",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const knownItems = useMemo(
    () => distinctValues(groceries, "item"),
    [groceries],
  );
  const knownStores = useMemo(
    () => distinctValues(groceries, "store", ["Unknown store"]),
    [groceries],
  );

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

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
        priceType: form.priceType,
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add price"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Item" className="sm:col-span-2">
          <SuggestInput
            value={form.item}
            onChange={(value) =>
              setForm((current) => ({ ...current, item: value }))
            }
            options={knownItems}
            placeholder="Milk, 4L"
            autoFocus
          />
        </Field>

        <Field label="Price">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={set("price")}
            placeholder="0.00"
          />
        </Field>

        <Field label="Price type" className="sm:col-span-2">
          <div className="flex gap-2">
            {PRICE_TYPES.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={
                  form.priceType === option.value ? "default" : "outline"
                }
                className="flex-1"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    priceType: option.value,
                  }))
                }
              >
                <i className={`fa-solid ${option.icon}`} />
                {option.label}
              </Button>
            ))}
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Only regular prices are compared across stores. Offers and markdowns
            are still logged and searchable.
          </p>
        </Field>

        <Field label="Store">
          <SuggestInput
            value={form.store}
            onChange={(value) =>
              setForm((current) => ({ ...current, store: value }))
            }
            options={knownStores}
            placeholder="No Frills"
          />
        </Field>

        <Field label="Date">
          <Input type="date" value={form.date} onChange={set("date")} />
        </Field>

        <Field label="Note" className="sm:col-span-2">
          <Input
            value={form.description}
            onChange={set("description")}
            placeholder="On sale until Sunday"
          />
        </Field>

        {error && (
          <div className="sm:col-span-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
