import { Plus } from "lucide-react";
import { Button } from "../ui/button";

export function AppHeader({ title, onAddTransaction }) {
  const displayTitle = title === "Budgets" ? "Categories & Budgets" : title;

  return (
    <header className="border-b border-[#eaeaea] bg-white">
      <div className="flex min-h-28 items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">
            Personal Finance
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[#191919] sm:text-3xl">
            {displayTitle}
          </h1>
        </div>

        <Button
          onClick={onAddTransaction}
          className="h-10 shrink-0 rounded-lg bg-[#191919] px-3 text-sm font-semibold text-white hover:bg-[#333333] sm:px-5"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">Add new Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
}
