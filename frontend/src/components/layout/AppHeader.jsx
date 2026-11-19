import { Plus } from "lucide-react";
import { Button } from "../ui/button";

export function AppHeader({ title, onAddTransaction }) {
  const displayTitle = title === "Budgets" ? "Categories & Budgets" : title;

  return (
    <header className="border-b border-border bg-background transition-colors duration-200">
      <div className="flex min-h-28 items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Personal Finance
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {displayTitle}
          </h1>
        </div>

        <Button
          onClick={onAddTransaction}
          className="h-10 shrink-0 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:px-5"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">Add new Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
}
