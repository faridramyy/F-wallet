import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { todayKey } from "../../lib/date-ranges";
import { centsToInput, dollarsToCents } from "../../lib/formatters";
import {
  defaultUnitForKind,
  formatUnitPrice,
  getPackageUnit,
  unitPriceCents,
  unitsForKind,
} from "../../lib/groceries";

// Active items, plus the one already chosen if it has since been archived,
// so an old price can still be edited.
const withCurrent = (active, all, idKey, currentId) =>
  currentId && !active.some((item) => item[idKey] === currentId)
    ? [...active, ...all.filter((item) => item[idKey] === currentId)]
    : active;

function getInitialForm(price, defaults, products) {
  const productId = price?.product_id ?? defaults.product_id ?? "";
  const kind = products.find((p) => p.product_id === productId)?.unit_kind;

  return {
    product_id: productId,
    store_id: price?.store_id ?? defaults.store_id ?? "",
    price: price ? centsToInput(price.price_cents) : "",
    package_quantity: price ? String(Number(price.package_quantity)) : "1",
    package_unit: price?.package_unit ?? defaultUnitForKind(kind),
    is_sale: price?.is_sale ?? false,
    observed_on: price?.observed_on ?? todayKey(),
    notes: price?.notes ?? "",
  };
}

function PriceDialogContent({
  price,
  defaults = {},
  products,
  stores,
  currency,
  onClose,
  onSave,
}) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() =>
    getInitialForm(price, defaults, products),
  );
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(price);

  const productList = withCurrent(
    products.filter((p) => !p.is_archived),
    products,
    "product_id",
    form.product_id,
  );
  const storeList = withCurrent(
    stores.filter((s) => !s.is_archived),
    stores,
    "store_id",
    form.store_id,
  );

  const product = products.find((p) => p.product_id === form.product_id);
  const unitOptions = unitsForKind(product?.unit_kind ?? "count").map(
    (unit) => ({ value: unit.value, label: unit.label }),
  );

  const updateField = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));

  // A new product may be measured differently: keep the unit only if it
  // still fits.
  function handleProductChange(productId) {
    const kind = products.find((p) => p.product_id === productId)?.unit_kind;

    setForm((current) => ({
      ...current,
      product_id: productId,
      package_unit:
        getPackageUnit(current.package_unit).kind === kind
          ? current.package_unit
          : defaultUnitForKind(kind),
    }));
  }

  const bind = (name) => ({
    id: `price_${name}`,
    value: form[name],
    onChange: (event) => updateField(name, event.target.value),
  });

  const priceCents = dollarsToCents(form.price);
  const quantity = Number(form.package_quantity);
  const preview =
    product && priceCents > 0 && quantity > 0
      ? formatUnitPrice(
          unitPriceCents({
            price_cents: priceCents,
            package_quantity: quantity,
            package_unit: form.package_unit,
          }),
          product.unit_kind,
          currency,
        )
      : null;

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "price",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.product_id) return toast.error("Choose a product.");
    if (!form.store_id) return toast.error("Choose a store.");
    if (!priceCents) return toast.error("Enter a valid price.");
    if (!(quantity > 0)) return toast.error("Enter a valid package size.");
    if (!form.observed_on) return toast.error("Choose a date.");

    setSaving(true);

    try {
      await onSave({
        product_id: form.product_id,
        store_id: form.store_id,
        price_cents: priceCents,
        package_quantity: quantity,
        package_unit: form.package_unit,
        is_sale: form.is_sale,
        observed_on: form.observed_on,
        notes: form.notes.trim() || null,
      });

      toast.success(isEditing ? "Price updated." : "Price logged.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save price.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title={isEditing ? "Edit price" : "Log a price"}
      description="What a product cost at a store."
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Log price"}
      submitDisabled={!form.product_id || !form.store_id || !form.price}
      saving={saving}
    >
      <Field label="Product" htmlFor="price_product_id">
        <Select
          id="price_product_id"
          value={form.product_id}
          onValueChange={handleProductChange}
          placeholder="Choose a product"
          options={productList.map((p) => ({
            value: p.product_id,
            label: p.product_name,
            description: p.brand || undefined,
          }))}
        />
      </Field>

      <Field label="Store" htmlFor="price_store_id">
        <Select
          id="price_store_id"
          value={form.store_id}
          onValueChange={(value) => updateField("store_id", value)}
          placeholder="Choose a store"
          options={storeList.map((s) => ({
            value: s.store_id,
            label: s.store_name,
            description: s.location || undefined,
          }))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price" htmlFor="price_price">
          <Input
            {...bind("price")}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="4.99"
          />
        </Field>

        <Field label="Package size" htmlFor="price_package_quantity">
          <Input
            {...bind("package_quantity")}
            type="number"
            min="0.001"
            step="any"
            inputMode="decimal"
            placeholder="1"
          />
        </Field>

        <Field label="Unit" htmlFor="price_package_unit">
          <Select
            id="price_package_unit"
            value={form.package_unit}
            onValueChange={(value) => updateField("package_unit", value)}
            options={unitOptions}
            disabled={!product}
          />
        </Field>
      </div>

      {preview && (
        <p className="-mt-2 text-xs text-muted-foreground">
          That's <span className="font-medium text-foreground">{preview}</span>
        </p>
      )}

      <Field label="Date" htmlFor="price_observed_on">
        <Input {...bind("observed_on")} type="date" max={todayKey()} />
      </Field>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={form.is_sale}
          onChange={(event) => updateField("is_sale", event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">On sale</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Sale prices are compared separately from regular prices.
          </span>
        </span>
      </label>

      <Field label="Notes" htmlFor="price_notes">
        <Textarea
          {...bind("notes")}
          maxLength={2000}
          placeholder="Optional notes"
          rows={2}
        />
      </Field>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form.
//   defaults: { product_id?, store_id? } to pre-fill a new price
export function PriceDialog(props) {
  if (!props.open) return null;

  return <PriceDialogContent key={props.price?.price_id} {...props} />;
}
