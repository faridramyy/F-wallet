import { Plus } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { Button } from "../ui/button";

export function AppHeader({ title, onAddTransaction }) {
  const profile = useAuth().user?.profile;

  const userName =
    profile?.given_name ||
    profile?.name ||
    profile?.email ||
    profile?.preferred_username ||
    "User";

  return (
    <header className="border-b border-border bg-card text-card-foreground transition-colors duration-200">
      <div className="flex min-h-28 items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Personal Finance
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onAddTransaction}
            className="h-10 shrink-0 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:px-5"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Add new Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>

          <div
            aria-label={`User avatar: ${userName}`}
            title={userName}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground ring-1 ring-border"
          >
            {userName.trim().charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
