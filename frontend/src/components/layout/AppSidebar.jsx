import { Logo } from "../Logo";
import { NavigationItems } from "./NavigationItems";

export function AppSidebar({ sidebarOpen }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar py-7 text-sidebar-foreground transition-all duration-200 md:flex md:flex-col ${
        sidebarOpen ? "md:w-62 md:px-5" : "md:w-19 md:px-3"
      }`}
    >
      <div
        className={`flex items-center py-2 ${
          sidebarOpen ? "px-2" : "justify-center"
        }`}
      >
        <Logo collapsed={!sidebarOpen} />
      </div>

      <div className="mt-12">
        {sidebarOpen && (
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Workspace
          </p>
        )}

        <NavigationItems collapsed={!sidebarOpen} />
      </div>
    </aside>
  );
}
