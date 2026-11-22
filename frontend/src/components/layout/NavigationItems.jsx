import { NavLink } from "react-router-dom";

import { navigation } from "../../lib/navigation";

export function NavigationItems({ collapsed = false }) {
  return (
    <nav className="space-y-1.5">
      {navigation.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          title={collapsed ? label : undefined}
          aria-label={label}
          className={({ isActive }) =>
            `flex w-full items-center rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"
            } ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`
          }
        >
          <Icon size={19} strokeWidth={1.9} />
          {!collapsed && <span className="whitespace-nowrap">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
