import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { CATEGORY_TYPE_OPTIONS } from "../../lib/options";
import { accountOptions, categoryOptions } from "../../lib/select-options";

function getInitialForm(category) {
  return {
    category_name: category?.category_name ?? "",
    category_type: category?.category_type ?? "expense",
    parent_category_id: category?.parent_category_id ?? "",
    default_account_id: category?.default_account_id ?? "",
    notes: category?.notes ?? "",
  };
}

function CategoryDialogContent({
  category,
  categories,
  accounts,
  onClose,
  onSave,
}) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() => getInitialForm(category));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(category);

  const updateField = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
  };

  const bind = (name) => ({
    id: name,
    value: form[name],
    onChange: (event) => updateField({ [name]: event.target.value }),
  });

  // Props for a <Select> bound to form[name].
  const bindSelect = (name) => ({
    id: name,
    value: form[name],
    onValueChange: (value) => updateField({ [name]: value }),
  });

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "category",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.category_name.trim()) {
      return toast.error("Enter a category name.");
    }

    setSaving(true);

    try {
      await onSave({
        category_name: form.category_name.trim(),
        category_type: form.category_type,
        parent_category_id: form.parent_category_id || null,
        default_account_id: form.default_account_id || null,
        notes: form.notes.trim() || null,
      });

      toast.success(isEditing ? "Category updated." : "Category created.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save category.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title={isEditing ? "Edit category" : "New category"}
      description="Organize your income and expenses."
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Create category"}
      saving={saving}
    >
      <Field label="Category name" htmlFor="category_name">
        <Input
          {...bind("category_name")}
          maxLength={100}
          placeholder="e.g. Groceries"
          autoFocus
        />
      </Field>

      <Field label="Category type" htmlFor="category_type">
        <Select
          {...bindSelect("category_type")}
          options={CATEGORY_TYPE_OPTIONS}
          // A parent of the other type is no longer valid.
          onValueChange={(value) =>
            updateField({ category_type: value, parent_category_id: "" })
          }
        />
      </Field>

      <Field label="Parent category" htmlFor="parent_category_id">
        <Select
          {...bindSelect("parent_category_id")}
          options={categoryOptions(categories, form.category_type, {
            none: "No parent (top-level)",
            // Not itself, and not one of its own sub-categories.
            exclude: category?.category_id,
          })}
        />
      </Field>

      <Field label="Default account" htmlFor="default_account_id">
        <Select
          {...bindSelect("default_account_id")}
          options={accountOptions(accounts, { none: "No default account" })}
        />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea {...bind("notes")} placeholder="Optional notes" rows={3} />
      </Field>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form built
// from the props.
export function CategoryDialog(props) {
  if (!props.open) return null;

  return <CategoryDialogContent key={props.category?.category_id} {...props} />;
}
