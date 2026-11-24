import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { arrayMove } from "@dnd-kit/sortable";
import { Archive, CreditCard, Landmark, Plus, Wallet } from "lucide-react";

import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { StatCard, StatGrid } from "../components/ui/stat-card";
import { TabBar } from "../components/ui/tab-bar";
import { ArchivedList } from "../components/common/ArchivedList";
import { SortableList } from "../components/common/SortableList";
import { AccountCard } from "../components/accounts/AccountCard";
import { AccountDialog } from "../components/accounts/AccountDialog";
import { useNotifications } from "../components/providers/useNotifications";
import { useAppData } from "../components/providers/useAppData";
import { createApi } from "../lib/api";
import { getAccountType, summarizeAccounts } from "../lib/accounts";
import { formatCents } from "../lib/formatters";
import { removeById, replaceById } from "../lib/collections";

const TABS = [
  { value: "active", label: "Active accounts" },
  { value: "archived", label: "Archived", icon: Archive },
];

export function AccountsPage() {
  const api = createApi(useAuth());
  const { toast, confirm } = useNotifications();

  // Loaded once after sign-in (see AppDataProvider); no fetching in this page.
  const {
    accounts,
    setAccounts,
    archivedAccounts,
    setArchivedAccounts,
    settings,
  } = useAppData();

  const [activeTab, setActiveTab] = useState("active");
  // null = closed, {} = creating, { account } = editing
  const [dialog, setDialog] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const editingAccount = dialog?.account ?? null;

  // AccountDialog shows its own success/error messages; errors are rethrown.
  async function handleSaveAccount(body) {
    if (editingAccount) {
      const { data } = await api.patch(
        `/accounts/${editingAccount.account_id}`,
        body,
      );
      setAccounts((current) =>
        replaceById(current, "account_id", data.account),
      );
    } else {
      const { data } = await api.post("/accounts", body);
      setAccounts((current) => [...current, data.account]);
    }
  }

  async function handleArchiveAccount(account) {
    const confirmed = await confirm({
      title: "Archive account?",
      description: `Are you sure you want to archive "${account.account_name}"? It will no longer appear in your active accounts, and you can restore it from the Archived tab.`,
      confirmText: "Archive account",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const { data } = await api.delete(`/accounts/${account.account_id}`);

      setAccounts((current) =>
        removeById(current, "account_id", account.account_id),
      );
      // Newest archived first, matching the order the server returns.
      setArchivedAccounts((current) => [data.account, ...current]);
      toast.success("Account archived.");
    } catch (err) {
      toast.error(err.message || "Unable to archive account.");
    }
  }

  async function handleRestoreAccount(account) {
    try {
      const { data } = await api.post(
        `/accounts/${account.account_id}/restore`,
      );

      setArchivedAccounts((current) =>
        removeById(current, "account_id", account.account_id),
      );
      setAccounts((current) => [...current, data.account]);
      toast.success("Account restored.");
    } catch (err) {
      toast.error(err.message || "Unable to restore account.");
    }
  }

  // Optimistic reorder: show the new order now, roll back if saving fails.
  async function handleReorder(from, to) {
    const previous = accounts;
    const reordered = arrayMove(accounts, from, to);

    setAccounts(reordered);
    setSavingOrder(true);

    try {
      const { data } = await api.patch("/accounts/order", {
        account_ids: reordered.map((item) => item.account_id),
      });

      if (data.accounts) setAccounts(data.accounts);
    } catch (err) {
      setAccounts(previous);
      toast.error(err.message || "Failed to save account order.");
    } finally {
      setSavingOrder(false);
    }
  }

  const currency = settings?.currency ?? "CAD";
  const money = (cents) => formatCents(cents, currency);
  const totals = summarizeAccounts(accounts);
  const hasCardLimits = totals.limitCents > 0;

  const openCreate = () => setDialog({});

  return (
    <div className="space-y-6">
      <StatGrid columns={3}>
        <StatCard
          icon={Wallet}
          label="Net money"
          value={money(totals.netCents)}
          valueClassName={totals.netCents < 0 ? "text-destructive" : undefined}
          description="What is left after clearing all debt"
        />
        <StatCard
          icon={CreditCard}
          tone={totals.debtCents > 0 ? "expense" : "default"}
          label="Card debt"
          value={money(totals.debtCents)}
          description="What you currently owe"
        />
        <StatCard
          icon={Landmark}
          tone="income"
          label="Available credit"
          value={hasCardLimits ? money(totals.availableCents) : "—"}
          description={
            hasCardLimits
              ? "Left to spend on your cards"
              : "Add a credit limit to a card to see this"
          }
        />
      </StatGrid>

      <TabBar
        value={activeTab}
        onValueChange={setActiveTab}
        items={TABS}
        actions={
          activeTab === "active" && (
            <Button onClick={openCreate}>
              <Plus />
              New account
            </Button>
          )
        }
      />

      {activeTab === "archived" ? (
        <ArchivedList
          noun="account"
          onRestore={handleRestoreAccount}
          items={archivedAccounts.map((account) => ({
            id: account.account_id,
            title: account.account_name,
            subtitle: getAccountType(account.account_type).label,
            archivedAt: account.archived_at,
            source: account,
          }))}
        />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your first account to start organizing your finances."
        >
          <Button onClick={openCreate}>
            <Plus />
            Create account
          </Button>
        </EmptyState>
      ) : (
        <SortableList
          layout="grid"
          items={accounts}
          getId={(account) => account.account_id}
          disabled={savingOrder}
          onReorder={handleReorder}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
          renderItem={(account, sortable) => (
            <AccountCard
              account={account}
              onEdit={(item) => setDialog({ account: item })}
              onArchive={handleArchiveAccount}
              {...sortable}
            />
          )}
        />
      )}

      <AccountDialog
        open={dialog !== null}
        account={editingAccount}
        currency={settings?.currency ?? "CAD"}
        onClose={() => setDialog(null)}
        onSave={handleSaveAccount}
      />
    </div>
  );
}
