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
};

// items: [{ value, label, icon? }]
function TabBar({
  value,
  onValueChange,
  items,
  variant = "underline",
  className,
  ...props
}) {
  const styles = variants[variant];

  return (
    <div role="tablist" className={cn(styles.list, className)} {...props}>
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
}

export { TabBar };
