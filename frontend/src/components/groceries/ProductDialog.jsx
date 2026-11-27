import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { UNIT_KINDS } from "../../lib/groceries";

const KIND_OPTIONS = UNIT_KINDS.map((kind) => ({
  value: kind.value,
  label: kind.label,
  description: `Compared per ${kind.base}`,
}));

function ProductDialogContent({ product, onClose, onSave }) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() => ({
    product_name: product?.product_name ?? "",
    brand: product?.brand ?? "",
    unit_kind: product?.unit_kind ?? "count",
    notes: product?.notes ?? "",
  }));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(product);

  const updateField = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));

  const bind = (name) => ({
    id: `product_${name}`,
    value: form[name],
    onChange: (event) => updateField(name, event.target.value),
  });

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "product",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const productName = form.product_name.trim();
    if (!productName) return toast.error("Enter a product name.");

    setSaving(true);

    try {
      await onSave({
        product_name: productName,
        brand: form.brand.trim() || null,
        unit_kind: form.unit_kind,
        notes: form.notes.trim() || null,
      });

      toast.success(isEditing ? "Product updated." : "Product added.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save product.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title={isEditing ? "Edit product" : "New product"}
      description="Something you buy regularly."
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Add product"}
      submitDisabled={!form.product_name.trim()}
      saving={saving}
    >
      <Field label="Product name" htmlFor="product_product_name">
        <Input
          {...bind("product_name")}
          maxLength={150}
          placeholder="e.g. 2% milk"
          autoFocus
        />
      </Field>

      <Field label="Brand" htmlFor="product_brand">
        <Input
          {...bind("brand")}
          maxLength={100}
          placeholder="Optional, e.g. Natrel"
        />
      </Field>

      <Field
        label="Measured by"
        htmlFor="product_unit_kind"
        hint="Prices are compared per kg, per L or per item, so different package sizes can be compared fairly."
      >
        <Select
          id="product_unit_kind"
          value={form.unit_kind}
          onValueChange={(value) => updateField("unit_kind", value)}
          options={KIND_OPTIONS}
        />
      </Field>

      <Field label="Notes" htmlFor="product_notes">
        <Textarea
          {...bind("notes")}
          maxLength={2000}
          placeholder="Optional notes"
          rows={3}
        />
      </Field>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form.
export function ProductDialog(props) {
  if (!props.open) return null;

  return <ProductDialogContent key={props.product?.product_id} {...props} />;
}
