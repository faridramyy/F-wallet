import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  GripVertical,
  Pencil,
} from "lucide-react";
import { cn } from "cn";

import { IconButton } from "../ui/icon-button";
import { UsageBar } from "../ui/usage-bar";

// One category row. It has no border of its own: CategoryBlock groups a
// parent and its sub-categories inside one bordered block.
//   budget: { spentCents, limitCents } when the category has a budget this
//           month; shown as a usage bar
export function CategoryCard({
  category,
  accountName,
  budget,
  currency,
  onEdit,
  onArchive,
  dragHandleProps,
  dragHandleRef,
  containerRef,
  style,
  isDragging = false,
  isChild = false,
}) {
  const isIncome = category.category_type === "income";
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 bg-card text-card-foreground transition-colors hover:bg-muted/40",
        isChild ? "py-3 pr-4 pl-10" : "p-4",
        isDragging && "opacity-50",
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
          "flex shrink-0 items-center justify-center rounded-xl",
          isChild ? "size-8" : "size-10",
          isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
        )}
      >
        <Icon className={isChild ? "size-4" : "size-5"} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.category_name}</p>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {accountName && <span>Default: {accountName}</span>}
          {category.notes && (
            <span className="max-w-full truncate">{category.notes}</span>
          )}
        </div>

        {budget && (
          <UsageBar
            className="mt-2 max-w-md"
            used={budget.spentCents / 100}
            limit={budget.limitCents / 100}
            currency={currency}
            remainingLabel="left"
            label={`${category.category_name} budget used`}
          />
        )}
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
