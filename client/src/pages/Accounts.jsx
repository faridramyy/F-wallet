import { useState } from "react";

import { useApp } from "../store";
import {
  Panel,
  StatCard,
  EmptyState,
  ConfirmModal,
  ProgressBar,
} from "../components/ui";
import { SortableList, SortableItem, DragHandle } from "../components/Reorder";
import {
  accountBalance,
  creditCardDebt,
  totalAvailableCredit,
  availableCredit,
  netMoney,
} from "../lib/calc";
import { money } from "../lib/format";
import AccountModal from "../modals/AccountModal";
import TransferModal from "../modals/TransferModal";
import { Button } from "@/components/ui/button";

const TYPE_ICONS = {
  chequing: "fa-building-columns",
  savings: "fa-piggy-bank",
  cash: "fa-money-bill-wave",
  credit: "fa-credit-card",
};

export default function Accounts() {
  const {
    accounts,
    transactions,
    currency,
    deleteAccount,
    updateAccount,
    reorderAccounts,
  } = useApp();

  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const fmt = (value) => money(value, { currency });

  const openNew = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditing(account);
    setShowModal(true);
  };

  const handleReorder = (newIds) => reorderAccounts(newIds);

  const affectedCount = (accountId) =>
    transactions.filter(
      (transaction) =>
        transaction.accountId === accountId ||
        transaction.fromAccountId === accountId ||
        transaction.toAccountId === accountId,
    ).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Money
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every account you track, and what is in it.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTransfer(true)}
            disabled={accounts.length < 2}
          >
            <i className="fa-solid fa-right-left" />
            Transfer
          </Button>

          <Button type="button" onClick={openNew}>
            <i className="fa-solid fa-plus" />
            Add account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Net money"
          value={fmt(netMoney(accounts, transactions))}
          tone={netMoney(accounts, transactions) >= 0 ? "positive" : "negative"}
          help="What is left after clearing all debt"
        />
        <StatCard
          label="Card debt"
          value={
            <span className="text-destructive">
              {fmt(creditCardDebt(accounts, transactions))}
            </span>
          }
          tone="negative"
          help="What you currently owe"
        />
        <StatCard
          label="Available credit"
          value={fmt(totalAvailableCredit(accounts, transactions))}
          help="Left to spend on your cards"
        />
      </div>

      <Panel>
        {accounts.length === 0 ? (
          <EmptyState
            icon="fa-wallet"
            title="No accounts yet"
            message="Add a chequing account, savings account, cash or a credit card to get started."
            action={
              <Button type="button" onClick={openNew}>
                Add your first account
              </Button>
            }
          />
        ) : (
          <SortableList
            ids={accounts.map((account) => account.id)}
            onReorder={handleReorder}
          >
            <div className="space-y-3">
              {accounts.map((account) => {
                const balance = accountBalance(account, transactions);
                const isCredit = account.type === "credit";
                const limit = Math.max(0, Number(account.creditLimit) || 0);
                const debt = Math.max(0, balance);
                const utilization = limit > 0 ? (debt / limit) * 100 : 0;

                return (
                  <SortableItem key={account.id} id={account.id}>
                    {({ attributes, listeners, isDragging }) => (
                      <div
                        className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-foreground/15 ${
                          isDragging ? "opacity-60" : ""
                        }`}
                        style={{
                          gridTemplateAreas:
                            '"handle icon main figures" "handle bar bar actions"',
                        }}
                      >
                        <div
                          className="flex h-full items-center justify-center"
                          style={{ gridArea: "handle" }}
                        >
                          <DragHandle
                            attributes={attributes}
                            listeners={listeners}
                            isDragging={isDragging}
                          />
                        </div>

                        <div style={{ gridArea: "icon" }}>
                          <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-lg text-foreground">
                            <i
                              className={`fa-solid ${TYPE_ICONS[account.type] || "fa-wallet"}`}
                            />
                          </div>
                        </div>

                        <div
                          className="flex min-w-0 flex-col gap-0.5"
                          style={{ gridArea: "main" }}
                        >
                          <p className="truncate text-sm font-bold">
                            {account.name}
                          </p>

                          <p className="truncate text-[11px] text-muted-foreground">
                            <span className="capitalize">{account.type}</span>
                            {account.institution
                              ? ` \u00b7 ${account.institution}`
                              : ""}
                            {account.lastFour
                              ? ` \u00b7 ends ${account.lastFour}`
                              : ""}
                          </p>
                        </div>

                        <div
                          className="whitespace-nowrap text-right"
                          style={{ gridArea: "figures" }}
                        >
                          <p
                            className={`text-[17px] font-bold tabular-nums ${
                              isCredit
                                ? debt > 0
                                  ? "text-destructive"
                                  : "text-primary"
                                : balance >= 0
                                  ? ""
                                  : "text-destructive"
                            }`}
                          >
                            {fmt(balance)}
                          </p>

                          {isCredit && (
                            <p className="mt-px text-[11px] text-muted-foreground">
                              {debt > 0 ? "owing" : "paid off"}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0" style={{ gridArea: "bar" }}>
                          {!isCredit && (
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                              <input
                                type="checkbox"
                                className="size-3.5 rounded accent-primary"
                                checked={account.includeInTotal !== false}
                                onChange={(event) =>
                                  updateAccount(account.id, {
                                    includeInTotal: event.target.checked,
                                  })
                                }
                              />
                              <span>
                                {account.includeInTotal === false
                                  ? "Not counted in total"
                                  : "Counted in total"}
                              </span>
                            </label>
                          )}

                          {isCredit && limit > 0 && (
                            <>
                              <ProgressBar
                                value={utilization}
                                max={100}
                                tone={
                                  utilization >= 70
                                    ? "danger"
                                    : utilization >= 30
                                      ? "warning"
                                      : ""
                                }
                              />

                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {fmt(availableCredit(account, transactions))}{" "}
                                available of {fmt(limit)}
                              </p>
                            </>
                          )}
                        </div>

                        <div
                          className="flex justify-end gap-1"
                          style={{ gridArea: "actions" }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(account)}
                            className="text-muted-foreground hover:bg-destructive/10"
                            aria-label="Edit"
                          >
                            <i className="fa-solid fa-pen" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setConfirming(account)}
                            aria-label="Delete"
                          >
                            <i className="fa-solid fa-trash" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableList>
        )}
      </Panel>

      {showModal && (
        <AccountModal account={editing} onClose={() => setShowModal(false)} />
      )}

      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}

      {confirming && (
        <ConfirmModal
          title="Delete account?"
          message={
            <>
              You are about to delete <strong>{confirming.name}</strong>.
              <br />
              <br />
              {affectedCount(confirming.id) > 0 ? (
                <span className="font-semibold text-destructive">
                  This account has {affectedCount(confirming.id)} associated
                  transaction
                  {affectedCount(confirming.id) === 1 ? "" : "s"}. Deleting it
                  will also delete them.
                </span>
              ) : (
                "This account has no associated transactions."
              )}
              <br />
              <br />
              This cannot be undone.
            </>
          }
          onConfirm={() => deleteAccount(confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
