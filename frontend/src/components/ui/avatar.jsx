import { cn } from "cn";

// A circle with the first letter of `name`.
function Avatar({ name, className }) {
  return (
    <div
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground ring-1 ring-border",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export { Avatar };
