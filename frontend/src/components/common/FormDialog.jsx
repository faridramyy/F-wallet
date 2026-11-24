import { cn } from "cn";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const widths = {
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
};

// Modal with a header, a scrollable form body and a Cancel / Submit footer.
// Render it only while it should be open. Every way of dismissing it (Escape,
// backdrop, close button, Cancel) calls onClose, so the caller can ask before
// discarding unsaved changes.
export function FormDialog({
  title,
  description,
  onClose,
  onSubmit,
  submitLabel,
  submitDisabled = false,
  saving = false,
  error,
  size = "md",
  children,
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          widths[size],
        )}
      >
        <DialogHeader className="border-b border-border p-5 pr-12">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {children}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={saving || submitDisabled}>
              {saving ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
