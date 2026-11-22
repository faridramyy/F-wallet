import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Tags,
  Settings,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboarcd" },
  { label: "Transactions", icon: ArrowLeftRight, page: "Transactions" },
  { label: "Accounts", icon: CreditCard, page: "Accounts" },
  { label: "Categories & Budgets", icon: Tags, page: "Categories" },
  { label: "Settings", icon: Settings, page: "Settings" },
];

export function NavigationItems({ activePage, onNavigate, collapsed = false }) {
  return (
    <nav className="space-y-1.5">
      {navigation.map(({ label, icon: Icon, page }) => {
        const active = activePage === page;

        return (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            title={collapsed ? label : undefined}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"
            } ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon size={19} strokeWidth={1.9} />
            {!collapsed && <span>{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
