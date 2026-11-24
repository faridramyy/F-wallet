import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  GripVertical,
  Pencil,
} from "lucide-react";
import { cn } from "cn";

import { IconButton } from "../ui/icon-button";

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
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <div
      ref={containerRef}
      style={{ ...style, marginLeft: `${(category.depth ?? 0) * 1.5}rem` }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors",
        isDragging ? "opacity-50 shadow-lg" : "hover:bg-muted/40",
      )}
    >
      <IconButton
        ref={dragHandleRef}
        {...dragHandleProps}
        icon={GripVertical}
        label={`Reorder ${category.category_name}`}
        className="cursor-grab touch-none active:cursor-grabbing"
      />

      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
        )}
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.category_name}</p>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {parentName && <span>Under {parentName}</span>}
          {accountName && <span>Default: {accountName}</span>}
          {category.notes && (
            <span className="max-w-full truncate">{category.notes}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          icon={Pencil}
          label={`Edit ${category.category_name}`}
          onClick={() => onEdit(category)}
        />
        <IconButton
          icon={Archive}
          tone="destructive"
          label={`Archive ${category.category_name}`}
          onClick={() => onArchive(category)}
        />
      </div>
    </div>
  );
}
