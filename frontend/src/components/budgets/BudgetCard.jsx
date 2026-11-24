import { CalendarDays, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";

import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { formatCents, formatMonthYear } from "../../lib/formatters";

export function BudgetCard({ budget, onEdit, onManageAllocations, onDelete }) {
  const monthLabel = formatMonthYear(budget.budget_year, budget.budget_month);
  const allocations = budget.allocations ?? [];

  const totalCents = allocations.reduce(
    (total, allocation) => total + Number(allocation.allocated_cents ?? 0),
    0,
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <CalendarDays className="size-5" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold">
              {budget.name || monthLabel}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {budget.name ? monthLabel : "Monthly budget"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            icon={Pencil}
            label="Edit budget"
            onClick={() => onEdit(budget)}
          />
          <IconButton
            icon={Trash2}
            tone="destructive"
            label="Delete budget"
            onClick={() => onDelete(budget)}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs text-muted-foreground">Total allocated</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {formatCents(totalCents)}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          {allocations.length}{" "}
          {allocations.length === 1 ? "category" : "categories"}
        </span>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onManageAllocations(budget)}
        >
          <SlidersHorizontal />
          Manage allocations
        </Button>
      </div>
    </div>
  );
}
