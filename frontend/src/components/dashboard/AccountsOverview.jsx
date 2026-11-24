import { cn } from "cn";

import { SectionCard } from "../common/SectionCard";
import { useAppData } from "../providers/useAppData";
import { formatCurrency } from "../../lib/formatters";
import { getAccountBalance, getAccountType } from "../../lib/accounts";

export function AccountsOverview() {
  const { accounts, settings } = useAppData();
  const currency = settings?.currency ?? "CAD";

  return (
    <SectionCard
      title="My accounts"
      description="Your financial accounts"
      viewAllTo="/accounts"
      contentClassName="space-y-1"
    >
      {accounts.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No accounts yet.
        </p>
      )}

      {accounts.map((account) => {
        const { icon: Icon, label } = getAccountType(account.account_type);
        const { amount, isNegative } = getAccountBalance(account);

        return (
          <div
            key={account.account_id}
            className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
          >
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {account.account_name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[account.institution_name, label].filter(Boolean).join(" · ")}
              </p>
            </div>

            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                isNegative && "text-destructive",
              )}
            >
              {isNegative && "-"}
              {formatCurrency(amount, account.currency ?? currency)}
            </p>
          </div>
        );
      })}
    </SectionCard>
  );
}
