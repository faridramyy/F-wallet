import { NavLink } from "react-router-dom";
import { cn } from "cn";

import { navigation } from "../../lib/navigation";

export function MobileNavigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-50 w-[calc(100%-32px)] max-w-105 -translate-x-1/2 md:hidden"
    >
      <div className="flex items-center justify-between gap-1 rounded-xl border border-border bg-card/90 p-2 text-card-foreground shadow-lg backdrop-blur-xl">
        {navigation.map(({ path, label, mobileLabel, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2.5 transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="text-2xs leading-none font-semibold">
                  {mobileLabel}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
