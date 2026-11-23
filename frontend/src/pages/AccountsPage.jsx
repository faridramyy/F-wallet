import { useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArchiveRestore,
  CreditCard,
  Plus,
  Wallet,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { AccountCard } from "../components/accounts/AccountCard";
import { AccountDialog } from "../components/accounts/AccountDialog";
import { AccountSummary } from "../components/accounts/AccountSummary";
import { apiRequest } from "../lib/api";
import { useNotifications } from "../components/providers/useNotifications";
import { useAppData } from "../components/providers/useAppData";
import { ACCOUNT_TYPE_LABELS } from "../lib/accounts";

function SortableAccountCard({ account, onEdit, onArchive, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: account.account_id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <AccountCard
      account={account}
      onEdit={onEdit}
      onArchive={onArchive}
      containerRef={setNodeRef}
      dragHandleRef={setActivatorNodeRef}
      dragHandleProps={{ ...attributes, ...listeners }}
      style={style}
      isDragging={isDragging}
    />
  );
}

export function AccountsPage() {
  const auth = useAuth();
  const { toast, confirm } = useNotifications();

  // Loaded once after sign-in (see AppDataProvider); no fetching in this page.
  const { accounts, setAccounts, archivedAccounts, setArchivedAccounts } =
    useAppData();

  const [activeTab, setActiveTab] = useState("active");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [activeDragAccount, setActiveDragAccount] = useState(null);

  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeAccounts = accounts.filter((account) => !account.is_archived);

  function openCreateDialog() {
    setEditingAccount(null);
    setDialogOpen(true);
  }

  function openEditDialog(account) {
    setEditingAccount(account);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAccount(null);
  }

  // The AccountDialog handles success and error notifications.
  // Errors are rethrown so the dialog can handle them.
  async function handleSaveAccount(data) {
    if (editingAccount) {
      const response = await apiRequest(
        `/accounts/${editingAccount.account_id}`,
        auth,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );

      setAccounts((current) =>
        current.map((item) =>
          item.account_id === editingAccount.account_id
            ? response.data.account
            : item,
        ),
      );
    } else {
      const response = await apiRequest("/accounts", auth, {
        method: "POST",
        body: JSON.stringify(data),
      });

      setAccounts((current) => [...current, response.data.account]);
    }
  }

  async function handleArchiveAccount(account) {
    const confirmed = await confirm({
      title: "Archive account?",
      description: `Are you sure you want to archive "${account.account_name}"? It will no longer appear in your active accounts, and you can restore it from the Archived tab.`,
      confirmText: "Archive account",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const response = await apiRequest(`/accounts/${account.account_id}`, auth, {
        method: "DELETE",
      });

      setAccounts((current) =>
        current.filter((item) => item.account_id !== account.account_id),
      );

      // Newest archived first, matching the order the server returns.
      setArchivedAccounts((current) => [response.data.account, ...current]);

      toast.success("Account archived.");
    } catch (err) {
      toast.error(err.message || "Unable to archive account.");
    }
  }

  async function handleRestoreAccount(account) {
    try {
      const response = await apiRequest(
        `/accounts/${account.account_id}/restore`,
        auth,
        { method: "POST" },
      );

      setArchivedAccounts((current) =>
        current.filter((item) => item.account_id !== account.account_id),
      );

      setAccounts((current) => [...current, response.data.account]);

      toast.success("Account restored.");
    } catch (err) {
      toast.error(err.message || "Unable to restore account.");
    }
  }

  function handleDragStart(event) {
    const account = accounts.find(
      (item) => item.account_id === event.active.id,
    );

    setActiveDragAccount(account || null);
  }

  function handleDragCancel() {
    setActiveDragAccount(null);
  }

  async function handleDragEnd(event) {
    setActiveDragAccount(null);

    const { active, over } = event;

    if (!over || active.id === over.id || savingOrder) return;

    const oldIndex = activeAccounts.findIndex(
      (item) => item.account_id === active.id,
    );

    const newIndex = activeAccounts.findIndex(
      (item) => item.account_id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const previousAccounts = accounts;
    const reorderedActive = arrayMove(activeAccounts, oldIndex, newIndex);

    // Archived accounts keep their place at the end of the list.
    setAccounts([
      ...reorderedActive,
      ...accounts.filter((item) => item.is_archived),
    ]);

    setSavingOrder(true);

    try {
      const response = await apiRequest("/accounts/order", auth, {
        method: "PATCH",
        body: JSON.stringify({
          account_ids: reorderedActive.map((item) => item.account_id),
        }),
      });

      if (response.data.accounts) {
        setAccounts(response.data.accounts);
      }

      toast.success("Account order saved.");
    } catch (err) {
      console.error("Failed to save account order:", err);

      setAccounts(previousAccounts);

      toast.error(err.message || "Failed to save account order.");
    } finally {
      setSavingOrder(false);
    }
  }

  const creditCardCount = activeAccounts.filter(
    (item) => item.account_type === "credit_card",
  ).length;

  const netWorthCount = activeAccounts.filter(
    (item) => item.include_in_net_worth,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accounts</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your bank accounts, savings, cash, and credit cards.
          </p>
        </div>

        {activeTab === "active" && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            New account
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AccountSummary
          icon={Wallet}
          label="Total accounts"
          value={activeAccounts.length}
        />

        <AccountSummary
          icon={CreditCard}
          label="Credit cards"
          value={creditCardCount}
        />

        <AccountSummary label="Included in net worth" value={netWorthCount} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === "active"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active accounts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === "archived"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Archive className="size-4" />
          Archived
        </button>
      </div>

      {activeTab === "active" ? (
        <>
          {savingOrder && (
            <span className="text-xs text-muted-foreground">
              Saving order...
            </span>
          )}

          {activeAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Wallet className="mx-auto size-8 text-muted-foreground" />

              <h3 className="mt-3 text-sm font-medium text-foreground">
                No accounts yet
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Add your first account to start organizing your finances.
              </p>

              <Button onClick={openCreateDialog} className="mt-4 gap-2">
                <Plus className="size-4" />
                Create account
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeAccounts.map((item) => item.account_id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {activeAccounts.map((account) => (
                    <SortableAccountCard
                      key={account.account_id}
                      account={account}
                      onEdit={openEditDialog}
                      onArchive={handleArchiveAccount}
                      disabled={savingOrder}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeDragAccount ? (
                  <div className="rotate-1 shadow-xl">
                    <AccountCard
                      account={activeDragAccount}
                      onEdit={() => {}}
                      onArchive={() => {}}
                      isDragging
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Archived accounts can be restored here.
          </p>

          {archivedAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Archive className="mx-auto size-8 text-muted-foreground" />

              <h3 className="mt-3 text-sm font-medium text-foreground">
                No archived accounts
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Accounts you archive will appear here.
              </p>
            </div>
          ) : (
            archivedAccounts.map((account) => (
              <div
                key={account.account_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {account.account_name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type}
                    {account.archived_at
                      ? ` · Archived ${new Date(
                          account.archived_at,
                        ).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleRestoreAccount(account)}
                >
                  <ArchiveRestore className="size-4" />
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <AccountDialog
        open={dialogOpen}
        account={editingAccount}
        currency="CAD"
        onClose={closeDialog}
        onSave={handleSaveAccount}
      />
    </div>
  );
}
