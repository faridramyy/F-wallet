import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Tags,
  Settings,
} from "lucide-react";

const navigation = [
  { label: "Home", page: "Dashboard", icon: LayoutDashboard },
  { label: "Activity", page: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", page: "Accounts", icon: CreditCard },
  { label: "Categories", page: "Categories", icon: Tags },
  { label: "Settings", page: "Settings", icon: Settings },
];

export function MobileNavigation({ activePage, onNavigate }) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-50 w-[calc(100%-32px)] max-w-105 -translate-x-1/2 md:hidden"
    >
      <div className="flex items-center justify-between gap-1 rounded-xl border border-border bg-card/90 p-2 text-card-foreground shadow-lg backdrop-blur-xl transition-colors duration-200">
        {navigation.map(({ label, page, icon: Icon }) => {
          const active = activePage === page;

          return (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2.5 transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
              <span className="text-[10px] font-semibold leading-none">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
