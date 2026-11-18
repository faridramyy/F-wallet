import { SidebarBrand } from "./SidebarBrand";
import { NavigationItems } from "./NavigationItems";

export function AppSidebar({ activePage, onNavigate }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
      <SidebarBrand />
      <div className="mt-10">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Workspace
        </p>
        <NavigationItems activePage={activePage} onNavigate={onNavigate} />
      </div>
      <div className="mt-auto rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Your finances,</p>
        <p className="text-sm text-slate-500">all in one place.</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500" />
          Dashboard preview
        </div>
      </div>
    </aside>
  );
}
