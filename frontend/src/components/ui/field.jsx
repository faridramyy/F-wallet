import { cn } from "cn";

import { Label } from "./label";

// Label + control + optional hint. Pass `htmlFor` matching the control's id.
function Field({ label, htmlFor, hint, className, children }) {
  return (
    <div data-slot="field" className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { Field };
