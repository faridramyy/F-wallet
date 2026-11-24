import { cn } from "cn";

import { Button } from "./button";

// Square, muted icon-only button. `label` is required for screen readers and
// doubles as the tooltip. tone="destructive" turns it red on hover.
function IconButton({
  label,
  icon: Icon,
  tone = "default",
  className,
  ...props
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      className={cn(
        "text-muted-foreground",
        tone === "destructive" &&
          "hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20",
        className,
      )}
      {...props}
    >
      <Icon />
    </Button>
  );
}

export { IconButton };
