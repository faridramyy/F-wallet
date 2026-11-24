import { cn } from "cn";

const variants = {
  // Underlined tabs that sit on a bottom border.
  underline: {
    list: "flex flex-wrap items-center gap-2 border-b border-border",
    tab: "-mb-px border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground aria-selected:border-primary aria-selected:text-foreground",
  },
  // Small filled pills, for filters.
  pill: {
    list: "flex flex-wrap gap-2",
    tab: "rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground aria-selected:bg-primary aria-selected:text-primary-foreground",
  },
  // Equal-width segments on a muted track, for switching a form's mode.
  segmented: {
    list: "grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1",
    tab: "justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm",
  },
};

// items: [{ value, label, icon? }]
// actions: optional buttons shown at the right end of the row (kept outside
// the tab list, which may only contain tabs).
function TabBar({
  value,
  onValueChange,
  items,
  variant = "underline",
  actions,
  className,
  ...props
}) {
  const styles = variants[variant];

  const list = (
    <div
      role="tablist"
      className={cn(styles.list, actions && "border-b-0", className)}
      {...props}
    >
      {items.map(({ value: itemValue, label, icon: Icon }) => (
        <button
          key={itemValue}
          type="button"
          role="tab"
          aria-selected={value === itemValue}
          onClick={() => onValueChange(itemValue)}
          className={cn(
            "inline-flex items-center gap-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            styles.tab,
          )}
        >
          {Icon && <Icon className="size-4" />}
          {label}
        </button>
      ))}
    </div>
  );

  if (!actions) return list;

  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-2",
        variant === "underline" && "border-b border-border",
      )}
    >
      {list}
      <div className="flex shrink-0 gap-2 pb-2">{actions}</div>
    </div>
  );
}

export { TabBar };
