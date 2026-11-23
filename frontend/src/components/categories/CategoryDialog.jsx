import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

import { useNotifications } from "../providers/useNotifications";

const EMPTY_FORM = {
  category_name: "",
  category_type: "expense",
  parent_category_id: "",
  default_account_id: "",
  notes: "",
};

function getInitialForm(category) {
  return category
    ? {
        category_name: category.category_name ?? "",
        category_type: category.category_type ?? "expense",
        parent_category_id: category.parent_category_id ?? "",
        default_account_id: category.default_account_id ?? "",
        notes: category.notes ?? "",
      }
    : { ...EMPTY_FORM };
}

function CategoryDialogContent({
  category,
  categories,
  accounts,
  onClose,
  onSave,
}) {
  const { toast, confirm } = useNotifications();

  const [form, setForm] = useState(() => getInitialForm(category));
  const [saving, setSaving] = useState(false);


  const isEditing = Boolean(category);

  const eligibleParents = categories.filter(
    (item) =>
      item.category_id !== category?.category_id &&
      item.category_type === form.category_type,
  );

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleClose = async () => {
    if (saving) return;

    const initialForm = getInitialForm(category);

    const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

    if (!hasChanges) {
      onClose();
      return;
    }

    const confirmed = await confirm({
      title: "Discard changes?",
      description:
        "You have unsaved category changes. Are you sure you want to close?",
      confirmText: "Discard changes",
      cancelText: "Keep editing",
      variant: "destructive",
    });

    if (confirmed) {
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!form.category_name.trim()) {
      toast.error("Enter a category name.");
      return;
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

      toast.success(
        isEditing
          ? "Category updated successfully."
          : "Category created successfully.",
      );

      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          handleClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isEditing ? "Edit category" : "New category"}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Organize your income and expenses.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="category_name">Category name</Label>

            <Input
              id="category_name"
              value={form.category_name}
              onChange={(event) =>
                updateField("category_name", event.target.value)
              }
              maxLength={100}
              placeholder="e.g. Groceries"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_type">Category type</Label>

            <select
              id="category_type"
              value={form.category_type}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  category_type: event.target.value,
                  parent_category_id: "",
                }));
              }}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_category_id">Parent category</Label>

            <select
              id="parent_category_id"
              value={form.parent_category_id}
              onChange={(event) =>
                updateField("parent_category_id", event.target.value)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">No parent (top-level)</option>

              {eligibleParents.map((item) => (
                <option key={item.category_id} value={item.category_id}>
                  {item.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_account_id">Default account</Label>

            <select
              id="default_account_id"
              value={form.default_account_id}
              onChange={(event) =>
                updateField("default_account_id", event.target.value)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">No default account</option>

              {accounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_notes">Notes</Label>

            <Textarea
              id="category_notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mounted only while open, so every opening starts from a fresh form built
// from the props (no effect needed to reset it).
export function CategoryDialog(props) {
  if (!props.open) return null;

  return <CategoryDialogContent key={props.category?.category_id} {...props} />;
}
