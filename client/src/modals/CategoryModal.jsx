import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Clock } from "lucide-react";

import { useApp } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [saving, setSaving] = useState(false);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const setValue = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }

    const monthlyBudget = Number(form.monthlyBudget || 0);
    const hourlyRate = Number(form.hourlyRate || 0);
    const overtimeRate = Number(form.overtimeRate || 0);

    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
      toast.error("Budget must be a valid non-negative number.");
      return;
    }

    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      toast.error("Hourly rate must be a valid non-negative number.");
      return;
    }

    if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
      toast.error("Overtime rate must be a valid non-negative number.");
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
        toast.success("Category updated successfully.");
      } else {
        await createCategory(payload);
        toast.success("Category created successfully.");
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
      toast.error("Failed to save category. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit category" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update category settings, budgets, or hourly rates."
              : "Create a new expense or income category."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={set("name")}
                placeholder="Groceries"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-type">Type</Label>
              <Select value={form.type} onValueChange={setValue("type")}>
                <SelectTrigger id="category-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "expense" ? (
              <div className="space-y-2">
                <Label htmlFor="monthly-budget">Monthly budget</Label>
                <Input
                  id="monthly-budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthlyBudget}
                  onChange={set("monthlyBudget")}
                  placeholder="0.00"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label>How is this income entered?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        form.entryMode === "fixed" ? "default" : "outline"
                      }
                      className="flex-1 gap-2"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          entryMode: "fixed",
                        }))
                      }
                    >
                      <Banknote className="h-4 w-4" />
                      Fixed amount
                    </Button>

                    <Button
                      type="button"
                      variant={
                        form.entryMode === "hourly" ? "default" : "outline"
                      }
                      className="flex-1 gap-2"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          entryMode: "hourly",
                        }))
                      }
                    >
                      <Clock className="h-4 w-4" />
                      Hourly
                    </Button>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    This sets how the transaction form opens for this category.
                    Fixed suits bonuses, gifts and refunds. You can still switch
                    modes on any individual transaction.
                  </p>
                </div>

                {form.entryMode === "fixed" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="default-amount">Usual amount</Label>
                    <Input
                      id="default-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.defaultAmount}
                      onChange={set("defaultAmount")}
                      placeholder="0.00"
                    />

                    <p className="text-[11px] text-muted-foreground">
                      Optional. If this income is usually the same amount, it
                      will be filled in for you. Leave blank to type it each
                      time.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="hourly-rate">Rate per hour</Label>
                      <Input
                        id="hourly-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.hourlyRate}
                        onChange={set("hourlyRate")}
                        placeholder="17.20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="overtime-rate">
                        Rate per overtime hour
                      </Label>
                      <Input
                        id="overtime-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.overtimeRate}
                        onChange={set("overtimeRate")}
                        placeholder="25.80"
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground sm:col-span-2">
                      Both rates are filled in for you when you log income in
                      this category.
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
