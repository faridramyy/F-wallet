import { cn } from "cn";

import { Label } from "./label";

// Label + control + optional hint. Pass `htmlFor` matching the control's id.
// min-w-0 lets a field shrink inside a grid, so a long value (e.g. an
// account name) truncates instead of widening the form.
function Field({ label, htmlFor, hint, className, children }) {
  return (
    <div data-slot="field" className={cn("min-w-0 space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { Field };
