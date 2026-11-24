import { cn } from "cn";

// The app icon (public/icon-192.png). In dark mode it sits on a white tile,
// like on a phone home screen, so the black wallet stays visible.
export function BrandMark({ className }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      width="32"
      height="32"
      className={cn(
        "size-8 shrink-0 rounded-lg dark:bg-white dark:p-0.5",
        className,
      )}
    />
  );
}

export function Logo({ collapsed = false }) {
  return (
    <div className="inline-flex items-center gap-3">
      <BrandMark />

      {!collapsed && (
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
          f-wallet
        </span>
      )}
    </div>
  );
}
