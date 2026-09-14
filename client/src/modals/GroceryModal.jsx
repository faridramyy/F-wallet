import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { today } from "../lib/format";

/*
  Why this matters beyond a label: a sale or a markdown says nothing about
  where an item is usually cheapest, so only regular prices are used for
  the store comparison on the Groceries page.
*/

/*
  Same folding as the search boxes: lowercase and strip accents, so
  "cafe" finds "Café". Consistency matters here, since an item typed one
  way and logged another will not match when the trip planner runs.
*/

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/*
  One suggestion engine for both fields. Names that start with what was
  typed come before names that merely contain it, and the most used come
  first within each group.
*/

function useSuggestions(values, term) {
  return useMemo(() => {
    const needle = fold(term.trim());

    // Nothing until two characters. One letter matches too much to be
    // worth dropping a panel over the form.
    if (needle.length < 2) return [];

    const starts = [];
    const contains = [];

    for (const value of values) {
      const folded = fold(value);

      if (folded === needle) continue;

      if (folded.startsWith(needle)) starts.push(value);
      else if (folded.includes(needle)) contains.push(value);
    }

    return [...starts, ...contains].slice(0, 5);
  }, [values, term]);
}

/*
  Distinct values for a field, most frequently used first. Grouped
  case-insensitively so one shop does not appear twice, but the original
  spelling is what gets suggested back.
*/

function distinctValues(entries, key, ignore = []) {
  const counts = new Map();

  for (const entry of entries) {
    const value = String(entry[key] || "").trim();

    if (!value || ignore.includes(value)) continue;

    const folded = fold(value);
    const existing = counts.get(folded);

    counts.set(folded, {
      value: existing?.value || value,
      count: (existing?.count || 0) + 1,
    });
  }

  return [...counts.values()].sort((a, b) => b.count - a.count).map((entry) => entry.value);
}

function Suggestions({ items, onPick }) {
  if (items.length === 0) return null;

  return (
    <ul className="suggest-list">
      {items.map((value) => (
        <li key={value}>
          {/*
            onMouseDown rather than onClick: blur fires first on a click,
            which would unmount the list before the selection registered.
          */}
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(value);
            }}
          >
            <span className="suggest-name">{value}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

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
  const [focusedField, setFocusedField] = useState("");

  const knownItems = useMemo(() => distinctValues(groceries, "item"), [groceries]);
  const knownStores = useMemo(
    () => distinctValues(groceries, "store", ["Unknown store"]),
    [groceries],
  );

  const itemSuggestions = useSuggestions(knownItems, form.item);
  const storeSuggestions = useSuggestions(knownStores, form.store);

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
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add price"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Item" className="sm:col-span-2">
          <div className="suggest-field">
            <input
              className="input"
              value={form.item}
              onChange={set("item")}
              onFocus={() => setFocusedField("item")}
              onBlur={() => setFocusedField("")}
              placeholder="Milk, 4L"
              autoComplete="off"
              autoFocus
            />

            {focusedField === "item" && (
              <Suggestions
                items={itemSuggestions}
                onPick={(value) => {
                  setForm((current) => ({ ...current, item: value }));
                  setFocusedField("");
                }}
              />
            )}
          </div>
        </Field>

        <Field label="Price">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={set("price")}
            placeholder="0.00"
          />
        </Field>

        <Field label="Price type" className="sm:col-span-2">
          <div className="segmented">
            {PRICE_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented-option ${form.priceType === option.value ? "active" : ""}`}
                onClick={() =>
                  setForm((current) => ({ ...current, priceType: option.value }))
                }
              >
                <i className={`fa-solid ${option.icon}`} />
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Only regular prices are compared across stores. Offers and markdowns are still logged and searchable.
          </p>
        </Field>

        <Field label="Store">
          <div className="suggest-field">
            <input
              className="input"
              value={form.store}
              onChange={set("store")}
              onFocus={() => setFocusedField("store")}
              onBlur={() => setFocusedField("")}
              placeholder="No Frills"
              autoComplete="off"
            />

            {focusedField === "store" && (
              <Suggestions
                items={storeSuggestions}
                onPick={(value) => {
                  setForm((current) => ({ ...current, store: value }));
                  setFocusedField("");
                }}
              />
            )}
          </div>
        </Field>

        <Field label="Date">
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={set("date")}
          />
        </Field>

        <Field label="Note" className="sm:col-span-2">
          <input
            className="input"
            value={form.description}
            onChange={set("description")}
            placeholder="On sale until Sunday"
          />
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
