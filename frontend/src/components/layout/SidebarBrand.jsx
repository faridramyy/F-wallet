import { Wallet } from "lucide-react";

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
        <Wallet size={22} />
      </div>
      <div>
        <p className="text-lg font-bold tracking-tight text-slate-900">
          F-Wallet
        </p>
        <p className="text-xs text-slate-400">Personal finance</p>
      </div>
    </div>
  );
}
