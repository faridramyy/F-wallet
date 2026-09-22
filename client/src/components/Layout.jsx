import { NavLink, useLocation } from "react-router-dom";

import { useApp } from "../store";
import BrandLogo from "../components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "fa-chart-pie", short: "Home" },
  { to: "/accounts", label: "Accounts", icon: "fa-wallet", short: "Accounts" },
  {
    to: "/categories",
    label: "Categories",
    icon: "fa-layer-group",
    short: "Budget",
  },
  {
    to: "/transactions",
    label: "Transactions",
    icon: "fa-arrow-right-arrow-left",
    short: "Activity",
  },
  {
    to: "/groceries",
    label: "Groceries",
    icon: "fa-basket-shopping",
    short: "Prices",
  },
  { to: "/settings", label: "Settings", icon: "fa-gear", short: "Settings" },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5);

// The --sidebar-* tokens exist in index.css specifically for this
// component, so nav rows use those instead of the generic background/
// foreground tokens the rest of the app uses.
const navLinkClass = ({ isActive }) =>
  cn(
    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );

export default function Layout({ children, onQuickAdd }) {
  const { logout, refresh, loading, isViewer } = useApp();

  const location = useLocation();

  const current = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.to),
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-20 items-center border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
                F-Wallet
              </h1>
              <p className="text-xs text-muted-foreground">Personal Finance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <span className="flex w-5.5 items-center justify-center text-[17px]">
                <i className={`fa-solid ${item.icon}`} />
              </span>

              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            className={navLinkClass({ isActive: false })}
            onClick={logout}
          >
            <span className="flex w-5.5 items-center justify-center text-[17px]">
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo small />
            <span className="text-base font-bold tracking-tight">F-Wallet</span>
          </div>

          <span className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground lg:flex">
            {current?.label || "Dashboard"}
          </span>

          {isViewer && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-eye" />
              Read only
            </span>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh"
              title="Refresh data"
            >
              <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
            </Button>

            <NavLink
              to="/settings"
              aria-label="Settings"
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 lg:hidden"
            >
              <i className="fa-solid fa-gear" />
            </NavLink>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="lg:hidden"
              onClick={logout}
              aria-label="Sign out"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </Button>
          </div>
        </header>

        <main className="px-4 pb-32 pt-5 sm:px-6 lg:pb-24">{children}</main>
      </div>

      <button
        type="button"
        onClick={onQuickAdd}
        aria-label="Add transaction"
        className="fixed bottom-[calc(74px+env(safe-area-inset-bottom)+14px)] right-4.5 z-45 flex size-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 lg:bottom-7 lg:right-7"
      >
        <i className="fa-solid fa-plus text-xl" />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex min-h-15.5 flex-col items-center justify-center gap-0.5 text-muted-foreground",
                isActive && "text-foreground",
              )
            }
          >
            <span className="text-xl leading-none">
              <i className={`fa-solid ${item.icon}`} />
            </span>
            <small className="text-[10px] font-semibold">{item.short}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
