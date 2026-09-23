import { useState } from "react";
import {
  Landmark,
  PiggyBank,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  ShieldAlert,
  TrendingDown,
  Scale,
} from "lucide-react";

import { useApp } from "../store";
import { EmptyState, ConfirmModal, ProgressBar } from "../components/ui";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const TYPE_ICONS = {
  chequing: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  credit: CreditCard,
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

  const currentNetMoney = netMoney(accounts, transactions);
  const currentCardDebt = creditCardDebt(accounts, transactions);
  const currentAvailableCredit = totalAvailableCredit(accounts, transactions);

  const summaryStats = [
    {
      label: "Net Money",
      value: fmt(currentNetMoney),
      help: "What is left after clearing all debt",
      icon: Scale,
      color: currentNetMoney >= 0 ? "text-emerald-500" : "text-destructive",
      bgColor: currentNetMoney >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
      className: "col-span-2 sm:col-span-1",
    },
    {
      label: "Card Debt",
      value: fmt(currentCardDebt),
      help: "What you currently owe",
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      isDestructiveValue: true,
    },
    {
      label: "Available Credit",
      value: fmt(currentAvailableCredit),
      help: "Left to spend on your cards",
      icon: CreditCard,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

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
            className="gap-2"
            onClick={() => setShowTransfer(true)}
            disabled={accounts.length < 2}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </Button>

          <Button type="button" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`border shadow-xs ${stat.className || ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bgColor} ${stat.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div
                    className={`text-xl font-bold tracking-tight tabular-nums ${
                      stat.isDestructiveValue ? "text-destructive" : ""
                    }`}
                  >
                    {stat.value}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {stat.help}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Your Accounts</CardTitle>
              <CardDescription className="text-xs">
                {accounts.length} tracked
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No accounts yet"
              message="Add a chequing account, savings account, cash or a credit card to get started."
              action={
                <Button type="button" onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" />
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
                  const TypeIcon = TYPE_ICONS[account.type] || Wallet;

                  return (
                    <SortableItem key={account.id} id={account.id}>
                      {({ attributes, listeners, isDragging }) => (
                        <Card
                          className={`border shadow-xs transition-colors hover:border-foreground/20 ${
                            isDragging ? "opacity-60" : ""
                          }`}
                        >
                          <CardContent className="p-3.5">
                            <div
                              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5"
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
                                <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                                  <TypeIcon className="h-5 w-5" />
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
                                  <span className="capitalize">
                                    {account.type}
                                  </span>
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

                              <div
                                className="min-w-0"
                                style={{ gridArea: "bar" }}
                              >
                                {!isCredit && (
                                  <div className="inline-flex items-center gap-2">
                                    <Checkbox
                                      id={`include-${account.id}`}
                                      checked={account.includeInTotal !== false}
                                      onCheckedChange={(checked) =>
                                        updateAccount(account.id, {
                                          includeInTotal: checked,
                                        })
                                      }
                                    />
                                    <Label
                                      htmlFor={`include-${account.id}`}
                                      className="cursor-pointer text-[11px] font-medium text-muted-foreground"
                                    >
                                      {account.includeInTotal === false
                                        ? "Not counted in total"
                                        : "Counted in total"}
                                    </Label>
                                  </div>
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
                                      {fmt(
                                        availableCredit(account, transactions),
                                      )}{" "}
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
                                  size="icon"
                                  onClick={() => openEdit(account)}
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setConfirming(account)}
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            </SortableList>
          )}
        </CardContent>
      </Card>

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
