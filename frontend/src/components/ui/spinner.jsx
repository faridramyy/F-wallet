import { cn } from "cn";

function Spinner({ className }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "size-8 animate-spin rounded-full border-4 border-muted border-t-primary",
        className,
      )}
    />
  );
}

// Full-screen centered status with an optional action.
function FullScreenMessage({ spinner = false, message, detail, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
      <div>
        {spinner && <Spinner className="mx-auto mb-4" />}
        <p className="text-sm text-muted-foreground">{message}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

export { Spinner, FullScreenMessage };
