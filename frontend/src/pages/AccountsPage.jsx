import { useMemo, useState } from "react";
import { CreditCard, Landmark, Plus, Wallet } from "lucide-react";

import { AccountCard } from "../components/accounts/AccountCard";
import { AccountSummary } from "../components/accounts/AccountSummary";
import { AccountDialog } from "../components/accounts/AccountDialog";
import { accounts as initialAccounts, appUsers } from "../data/mockData";
import { formatCurrency } from "../lib/formatters";

export function AccountsPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeAccounts = accounts.filter((account) => !account.is_archived);

  const summary = useMemo(() => {
    const assets = activeAccounts
      .filter((account) => account.account_type !== "credit_card")
      .reduce(
        (total, account) => total + Math.max(0, Number(account.balance || 0)),
        0,
      );

    const debt = activeAccounts
      .filter((account) => account.account_type === "credit_card")
      .reduce(
        (total, account) => total + Math.max(0, -Number(account.balance || 0)),
        0,
      );

    return {
      assets,
      debt,
      netWorth: assets - debt,
    };
  }, [activeAccounts]);

  function handleAddAccount(newAccount) {
    const userId = appUsers[0]?.user_id || "";

    setAccounts((current) => [...current, { ...newAccount, user_id: userId }]);
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Accounts
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your bank accounts, savings, and credit cards.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus size={17} />
            Add account
          </button>
        </div>

        {/* Account summaries */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AccountSummary
            label="Total assets"
            value={formatCurrency(summary.assets)}
            description="Across checking and savings"
            icon={Wallet}
          />

          <AccountSummary
            label="Credit card debt"
            value={formatCurrency(summary.debt)}
            description="Outstanding card balances"
            icon={CreditCard}
          />

          <AccountSummary
            label="Net worth"
            value={formatCurrency(summary.netWorth)}
            description="Assets minus credit card debt"
            icon={Landmark}
          />
        </section>

        {/* Accounts list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Your accounts
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeAccounts.length} active{" "}
                {activeAccounts.length === 1 ? "account" : "accounts"}
              </p>
            </div>
          </div>

          {activeAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeAccounts.map((account) => (
                <AccountCard key={account.account_id} account={account} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card">
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Wallet size={23} />
                </div>

                <h3 className="mt-4 font-semibold text-foreground">
                  No accounts yet
                </h3>

                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add your first account to start tracking your money.
                </p>

                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  <Plus size={16} />
                  Add your first account
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <AccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAddAccount}
        currency="CAD"
      />
    </>
  );
}
