import { NavLink, useLocation } from "react-router-dom";

import { useApp } from "../store";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "fa-chart-pie", short: "Home" },
  { to: "/accounts", label: "Accounts", icon: "fa-wallet", short: "Accounts" },
  { to: "/categories", label: "Categories", icon: "fa-layer-group", short: "Budget" },
  { to: "/transactions", label: "Transactions", icon: "fa-arrow-right-arrow-left", short: "Activity" },
  { to: "/groceries", label: "Groceries", icon: "fa-basket-shopping", short: "Prices" },
  { to: "/settings", label: "Settings", icon: "fa-gear", short: "Settings" },
];

export default function Layout({ children, onQuickAdd }) {
  const { logout, refresh, loading } = useApp();

  const location = useLocation();

  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));

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
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="brand-icon small">F</div>
            <span className="text-base font-bold tracking-tight">F-Wallet</span>
          </div>

          <span className="hidden text-sm font-semibold text-slate-500 lg:block">
            {current?.label || "Dashboard"}
          </span>

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

            <button type="button" className="header-action lg:hidden" onClick={logout} aria-label="Sign out">
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </button>

            <button type="button" className="primary-button hidden sm:inline-flex" onClick={onQuickAdd}>
              <i className="fa-solid fa-plus" />
              Add transaction
            </button>
          </div>
        </header>

        <main className="px-4 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV_ITEMS.slice(0, 3).map((item) => (
          <MobileNavItem key={item.to} item={item} />
        ))}

        <button type="button" className="mobile-add-button" onClick={onQuickAdd} aria-label="Add transaction">
          <i className="fa-solid fa-plus" />
        </button>

        {NAV_ITEMS.slice(3, 5).map((item) => (
          <MobileNavItem key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}

function MobileNavItem({ item }) {
  return (
    <NavLink to={item.to} className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}>
      <span>
        <i className={`fa-solid ${item.icon}`} />
      </span>
      <small>{item.short}</small>
    </NavLink>
  );
}
