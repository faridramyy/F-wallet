import { Bell, Menu, Plus } from "lucide-react";
import { Button } from "../ui/button";

export function AppHeader({ title, onAddTransaction, onOpenMobileNavigation }) {
  const today = new Date().toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-9">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenMobileNavigation}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </Button>
          <div>
            <h1 className="text-base font-semibold text-slate-900">{title}</h1>
            <p className="hidden text-xs text-slate-400 sm:block">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500"
            aria-label="Notifications"
          >
            <Bell size={19} />
          </Button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">Personal account</p>
            <p className="text-xs text-slate-400">F-Wallet</p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
            F
          </div>
          <Button
            onClick={onAddTransaction}
            className="ml-1 h-9 rounded-xl bg-emerald-600 px-3 text-white hover:bg-emerald-700 sm:px-4"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
