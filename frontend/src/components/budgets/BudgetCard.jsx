import { CalendarDays, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { formatCurrency } from "../../lib/formatters";

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
});

export function BudgetCard({ budget, onEdit, onManageAllocations, onDelete }) {
  const monthLabel = monthFormatter.format(
    new Date(budget.budget_year, budget.budget_month - 1, 1),
  );

  const allocations = budget.allocations || [];

  const totalCents = allocations.reduce(
    (total, allocation) => total + BigInt(allocation.allocated_cents ?? 0),
    0n,
  );

  const totalAllocated = Number(totalCents) / 100;

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">
              {budget.name || monthLabel}
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {budget.name ? monthLabel : "Monthly budget"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(budget)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Edit budget"
            title="Edit budget"
          >
            <Pencil className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(budget)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete budget"
            title="Delete budget"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs text-muted-foreground">Total allocated</p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {formatCurrency(totalAllocated)}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          {allocations.length}{" "}
          {allocations.length === 1 ? "category" : "categories"}
        </span>

        <button
          type="button"
          onClick={() => onManageAllocations(budget)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          <SlidersHorizontal className="size-3.5" />
          Manage allocations
        </button>
      </div>
    </div>
  );
}
