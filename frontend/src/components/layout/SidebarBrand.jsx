import { Logo } from "../Logo";

export function SidebarBrand({ collapsed = false }) {
  return (
    <div
      className={`flex items-center ${
        collapsed ? "justify-center" : "px-2"
      } py-2`}
    >
      <Logo collapsed={collapsed} />
    </div>
  );
}
