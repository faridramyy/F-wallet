import { NavLink, useLocation } from "react-router-dom";

import { useApp } from "../store";

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

/*
  The bottom bar shows the first five destinations in a fixed five column
  grid, so every item gets exactly the same width no matter how long its
  label is. Adding a transaction lives in a floating button instead of
  sitting inside the row, because a taller element in the middle of a flex
  row is what made the old spacing look off.
*/

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5);

export default function Layout({ children, onQuickAdd }) {
  const { logout, refresh, loading, isViewer } = useApp();

  const location = useLocation();

  const current = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.to),
  );

  return (
    <div className="app-shell">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="brand-icon">F</div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">F-Wallet</h1>
              <p className="text-xs text-slate-400">Personal Finance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">
                <i className={`fa-solid ${item.icon}`} />
              </span>

              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button type="button" className="nav-item" onClick={logout}>
            <span className="nav-icon">
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="app-header sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="brand-icon small">F</div>
            <span className="text-base font-bold tracking-tight">F-Wallet</span>
          </div>

          <span className="hidden items-center gap-2 text-sm font-semibold text-slate-500 lg:flex">
            {current?.label || "Dashboard"}
          </span>

          {isViewer && (
            <span className="viewer-pill">
              <i className="fa-solid fa-eye" />
              Read only
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="header-action"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh"
              title="Refresh data"
            >
              <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
            </button>

            <NavLink
              to="/settings"
              className="header-action lg:hidden"
              aria-label="Settings"
            >
              <i className="fa-solid fa-gear" />
            </NavLink>

            <button
              type="button"
              className="header-action lg:hidden"
              onClick={logout}
              aria-label="Sign out"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </button>
          </div>
        </header>

        <main className="px-4 pb-32 pt-5 sm:px-6 lg:pb-24">{children}</main>
      </div>

      <button
        type="button"
        className="fab"
        onClick={onQuickAdd}
        aria-label="Add transaction"
      >
        <i className="fa-solid fa-plus" />
      </button>

      <nav className="mobile-nav lg:hidden">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>
              <i className={`fa-solid ${item.icon}`} />
            </span>
            <small>{item.short}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
