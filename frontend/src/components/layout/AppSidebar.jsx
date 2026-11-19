import { SidebarBrand } from "./SidebarBrand";
import { NavigationItems } from "./NavigationItems";

export function AppSidebar({ activePage, onNavigate, sidebarOpen }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar py-7 transition-all duration-200 md:flex md:flex-col ${
        sidebarOpen ? "md:w-62 md:px-5" : "md:w-19 md:px-3"
      }`}
    >
      <SidebarBrand collapsed={!sidebarOpen} />

      <div className="mt-12">
        {sidebarOpen && (
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Workspace
          </p>
        )}

        <NavigationItems
          activePage={activePage}
          onNavigate={onNavigate}
          collapsed={!sidebarOpen}
        />
      </div>
    </aside>
  );
}
