import {
  ArrowDownLeft,
  ArrowUpRight,
  Archive,
  Pencil,
  GripVertical,
} from "lucide-react";

export function CategoryCard({
  category,
  parentName,
  accountName,
  onEdit,
  onArchive,
  dragHandleProps,
  dragHandleRef,
  containerRef,
  style,
  isDragging = false,
}) {
  const isIncome = category.category_type === "income";

  return (
    <div
      ref={containerRef}
      style={style}
      className={`group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors ${
        isDragging ? "opacity-50 shadow-lg" : "hover:bg-muted/40"
      }`}
    >
      <button
        ref={dragHandleRef}
        type="button"
        {...dragHandleProps}
        className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Reorder ${category.category_name}`}
      >
        <GripVertical className="size-4" />
      </button>

      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          isIncome
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-orange-500/10 text-orange-600"
        }`}
      >
        {isIncome ? (
          <ArrowDownLeft className="size-5" />
        ) : (
          <ArrowUpRight className="size-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {category.category_name}
          </p>

          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isIncome
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-orange-500/10 text-orange-600"
            }`}
          >
            {isIncome ? "Income" : "Expense"}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {parentName && <span>Under {parentName}</span>}
          {accountName && <span>Default: {accountName}</span>}
          {category.notes && (
            <span className="max-w-full truncate">{category.notes}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Edit ${category.category_name}`}
        >
          <Pencil className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onArchive(category)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Archive ${category.category_name}`}
        >
          <Archive className="size-4" />
        </button>
      </div>
    </div>
  );
}
