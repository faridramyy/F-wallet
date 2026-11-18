import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { SidebarBrand } from "./SidebarBrand";
import { NavigationItems } from "./NavigationItems";

export function MobileNavigation({ activePage, onNavigate }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("fwallet:open-navigation", handler);
    return () => window.removeEventListener("fwallet:open-navigation", handler);
  }, []);

  const handleNavigate = (page) => {
    onNavigate(page);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 bg-white p-5">
        <SheetHeader className="p-0 text-left">
          <SheetTitle>
            <SidebarBrand />
          </SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          <NavigationItems
            activePage={activePage}
            onNavigate={handleNavigate}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
