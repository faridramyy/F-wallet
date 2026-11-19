export function SidebarBrand({ collapsed = false }) {
  return (
    <div
      className={`flex items-center ${
        collapsed ? "justify-center" : "gap-3 px-2"
      } py-2`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
        f.
      </div>

      {!collapsed && (
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
          f-wallet
        </span>
      )}
    </div>
  );
}
