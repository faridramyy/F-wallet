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
    <header className="border-b border-border bg-card text-card-foreground">
      <div className="flex min-h-28 items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <div>
          <p className="mb-1 text-2xs font-semibold tracking-widest uppercase text-muted-foreground">
            Personal Finance
          </p>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button size="lg" onClick={onAddTransaction} className="h-10 px-3 sm:px-5">
            <Plus />
            <span className="hidden sm:inline">Add new Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>

          <div
            aria-label={`User avatar: ${userName}`}
            title={userName}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground ring-1 ring-border"
          >
            {userName.trim().charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
