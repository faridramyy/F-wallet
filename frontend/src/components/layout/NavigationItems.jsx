import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  ChartNoAxesCombined,
  Settings,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Accounts", icon: CreditCard },
  { label: "Budgets", icon: ChartNoAxesCombined },
  { label: "Settings", icon: Settings },
];

export function NavigationItems({ activePage, onNavigate }) {
  return (
    <nav className="space-y-1">
      {navigation.map(({ label, icon: Icon }) => {
        const active = activePage === label;
        return (
          <button
            key={label}
            onClick={() => onNavigate(label)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-50 text-emerald-800"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon size={19} strokeWidth={1.8} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
