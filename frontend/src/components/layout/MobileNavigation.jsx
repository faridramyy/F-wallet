import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  ChartNoAxesCombined,
  Settings,
} from "lucide-react";

const navigation = [
  { label: "Home", page: "Dashboard", icon: LayoutDashboard },
  { label: "Activity", page: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", page: "Accounts", icon: CreditCard },
  { label: "Budgets", page: "Budgets", icon: ChartNoAxesCombined },
  { label: "Settings", page: "Settings", icon: Settings },
];

export function MobileNavigation({ activePage, onNavigate }) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-50 w-[calc(100%-32px)] max-w-105 -translate-x-1/2 md:hidden"
    >
      <div className="flex items-center justify-between gap-1 rounded-[28px] border border-white/70 bg-white/65 p-2 shadow-[0_8px_35px_rgba(0,0,0,0.12)] backdrop-blur-2xl backdrop-saturate-150">
        {navigation.map(({ label, page, icon: Icon }) => {
          const active = activePage === page;

          return (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-2.5 transition-all duration-300 ${
                active
                  ? "bg-white/90 text-[#191919] shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                  : "text-[#858585] hover:bg-white/40 hover:text-[#191919]"
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
