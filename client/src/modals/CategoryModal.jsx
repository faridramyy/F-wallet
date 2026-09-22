import { useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
  const setValue = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Category name" className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="Groceries"
            autoFocus
          />
        </Field>

        <Field label="Type">
          <Select value={form.type} onValueChange={setValue("type")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {form.type === "expense" ? (
          <Field label="Monthly budget">
            <Input
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.entryMode === "fixed" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() =>
                    setForm((current) => ({ ...current, entryMode: "fixed" }))
                  }
                >
                  <i className="fa-solid fa-money-bill" />
                  Fixed amount
                </Button>

                <Button
                  type="button"
                  variant={form.entryMode === "hourly" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() =>
                    setForm((current) => ({ ...current, entryMode: "hourly" }))
                  }
                >
                  <i className="fa-solid fa-clock" />
                  Hourly
                </Button>
              </div>

              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                This sets how the transaction form opens for this category.
                Fixed suits bonuses, gifts and refunds. You can still switch
                modes on any individual transaction.
              </p>
            </Field>

            {form.entryMode === "fixed" ? (
              <Field label="Usual amount" className="sm:col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.defaultAmount}
                  onChange={set("defaultAmount")}
                  placeholder="0.00"
                />

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Optional. If this income is usually the same amount, it will
                  be filled in for you. Leave blank to type it each time.
                </p>
              </Field>
            ) : (
              <>
                <Field label="Rate per hour">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.hourlyRate}
                    onChange={set("hourlyRate")}
                    placeholder="17.20"
                  />
                </Field>

                <Field label="Rate per overtime hour">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.overtimeRate}
                    onChange={set("overtimeRate")}
                    placeholder="25.80"
                  />
                </Field>

                <p className="text-[11px] text-muted-foreground sm:col-span-2">
                  Both rates are filled in for you when you log income in this
                  category.
                </p>
              </>
            )}
          </>
        )}

        {error && (
          <div className="sm:col-span-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
