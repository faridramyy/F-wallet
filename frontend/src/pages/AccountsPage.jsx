import { useCallback, useEffect, useState } from "react";
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
import { Plus, Wallet } from "lucide-react";

import { AccountCard } from "../components/accounts/AccountCard";
import { AccountDialog } from "../components/accounts/AccountDialog";
import { AccountsSkeleton } from "../skeletons/AccountsSkeleton";
import { apiRequest } from "../lib/api";
import { useNotifications } from "../components/providers/useNotifications";

function SortableAccountCard({ account, onEdit, onDelete, disabled }) {
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
    <div ref={setNodeRef} style={style}>
      <AccountCard
        account={account}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{
          ...attributes,
          ...listeners,
          ref: setActivatorNodeRef,
        }}
      />
    </div>
  );
}

export function AccountsPage() {
  const auth = useAuth();
  const { toast, confirm } = useNotifications();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeDragAccount, setActiveDragAccount] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const response = await apiRequest("/accounts", auth);

      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      setLoadError(true);
      toast.error(error.message || "Failed to load your accounts.");
    } finally {
      setLoading(false);
    }
  }, [auth, toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function handleAddClick() {
    setSelectedAccount(null);
    setDialogOpen(true);
  }

  function handleEditClick(account) {
    setSelectedAccount(account);
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setSelectedAccount(null);
  }

  async function handleSaveAccount(accountData) {
    try {
      if (selectedAccount) {
        const response = await apiRequest(
          `/accounts/${selectedAccount.account_id}`,
          auth,
          {
            method: "PATCH",
            body: JSON.stringify(accountData),
          },
        );

        const updatedAccount = response.data.account;

        setAccounts((current) =>
          current.map((account) =>
            account.account_id === updatedAccount.account_id
              ? updatedAccount
              : account,
          ),
        );

        toast.success("Account updated successfully.");
      } else {
        const response = await apiRequest("/accounts", auth, {
          method: "POST",
          body: JSON.stringify(accountData),
        });

        const createdAccount = response.data.account;

        setAccounts((current) => [...current, createdAccount]);

        toast.success("Account created successfully.");
      }
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error(error.message || "Failed to save account.");
      throw error;
    }
  }

  async function handleDeleteAccount(account) {
    const confirmed = await confirm({
      title: "Archive account?",
      description: `Are you sure you want to archive "${account.account_name}"? The account will be removed from your active accounts.`,
      confirmText: "Archive account",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/accounts/${account.account_id}`, auth, {
        method: "DELETE",
      });

      setAccounts((current) =>
        current.filter((item) => item.account_id !== account.account_id),
      );

      toast.success("Account archived successfully.");
    } catch (error) {
      console.error("Failed to archive account:", error);
      toast.error(error.message || "Failed to archive account.");
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

    if (!over || active.id === over.id || savingOrder) {
      return;
    }

    const activeAccounts = accounts.filter((account) => !account.is_archived);

    const oldIndex = activeAccounts.findIndex(
      (account) => account.account_id === active.id,
    );

    const newIndex = activeAccounts.findIndex(
      (account) => account.account_id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedActiveAccounts = arrayMove(
      activeAccounts,
      oldIndex,
      newIndex,
    );

    const archivedAccounts = accounts.filter((account) => account.is_archived);

    const reorderedAccounts = [...reorderedActiveAccounts, ...archivedAccounts];

    const previousAccounts = accounts;

    setAccounts(reorderedAccounts);
    setSavingOrder(true);

    try {
      const response = await apiRequest("/accounts/order", auth, {
        method: "PATCH",
        body: JSON.stringify({
          account_ids: reorderedActiveAccounts.map(
            (account) => account.account_id,
          ),
        }),
      });

      if (response.data.accounts) {
        setAccounts(response.data.accounts);
      }

      toast.success("Account order saved.");
    } catch (error) {
      console.error("Failed to save account order:", error);
      setAccounts(previousAccounts);
      toast.error(error.message || "Failed to save account order.");
    } finally {
      setSavingOrder(false);
    }
  }

  const activeAccounts = accounts.filter((account) => !account.is_archived);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {loading
                ? "Loading your accounts..."
                : `${activeAccounts.length} active ${
                    activeAccounts.length === 1 ? "account" : "accounts"
                  }`}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage your bank accounts, savings, cash, and credit cards.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus size={17} />
            Add account
          </button>
        </div>

        <section className="space-y-4">
          {loading ? (
            <AccountsSkeleton />
          ) : loadError ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 text-center">
              <p className="text-sm text-muted-foreground">
                We couldn't load your accounts.
              </p>

              <button
                type="button"
                onClick={loadAccounts}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Try again
              </button>
            </div>
          ) : activeAccounts.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeAccounts.map((account) => account.account_id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeAccounts.map((account) => (
                    <SortableAccountCard
                      key={account.account_id}
                      account={account}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteAccount}
                      disabled={savingOrder}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay
                dropAnimation={{
                  duration: 220,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}
              >
                {activeDragAccount ? (
                  <div className="rotate-2 scale-[1.02] cursor-grabbing shadow-2xl">
                    <AccountCard
                      account={activeDragAccount}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      isDragging
                      isOverlay
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
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
                  Add your first account to start organizing your finances.
                </p>

                <button
                  type="button"
                  onClick={handleAddClick}
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
        onClose={handleCloseDialog}
        onSave={handleSaveAccount}
        currency="CAD"
        account={selectedAccount}
      />
    </>
  );
}
