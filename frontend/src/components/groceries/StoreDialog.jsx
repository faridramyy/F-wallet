import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";

function StoreDialogContent({ store, onClose, onSave }) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() => ({
    store_name: store?.store_name ?? "",
    location: store?.location ?? "",
    notes: store?.notes ?? "",
  }));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(store);

  const bind = (name) => ({
    id: `store_${name}`,
    value: form[name],
    onChange: (event) =>
      setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "store",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const storeName = form.store_name.trim();
    if (!storeName) return toast.error("Enter a store name.");

    setSaving(true);

    try {
      await onSave({
        store_name: storeName,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      });

      toast.success(isEditing ? "Store updated." : "Store added.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save store.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title={isEditing ? "Edit store" : "New store"}
      description="A place where you buy groceries."
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Add store"}
      submitDisabled={!form.store_name.trim()}
      saving={saving}
    >
      <Field label="Store name" htmlFor="store_store_name">
        <Input
          {...bind("store_name")}
          maxLength={100}
          placeholder="e.g. No Frills"
          autoFocus
        />
      </Field>

      <Field label="Location" htmlFor="store_location">
        <Input
          {...bind("location")}
          maxLength={150}
          placeholder="Optional, e.g. Queen St W"
        />
      </Field>

      <Field label="Notes" htmlFor="store_notes">
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
export function StoreDialog(props) {
  if (!props.open) return null;

  return <StoreDialogContent key={props.store?.store_id} {...props} />;
}
