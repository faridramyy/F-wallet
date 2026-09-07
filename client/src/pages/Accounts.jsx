import { useState } from "react";

import { useApp } from "../store";
import {
  Panel,
  StatCard,
  EmptyState,
  ConfirmModal,
  ProgressBar,
} from "../components/ui";
import { ReorderButtons, moveItem } from "../components/Reorder";
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

  const move = (from, to) => {
    const reordered = moveItem(accounts, from, to);

    if (reordered === accounts) return;

    reorderAccounts(reordered.map((account) => account.id));
  };

  const affectedCount = (accountId) =>
    transactions.filter(
      (transaction) =>
        transaction.accountId === accountId ||
        transaction.fromAccountId === accountId ||
        transaction.toAccountId === accountId,
    ).length;

  return (
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Money</p>
          <h2 className="page-title">Accounts</h2>
          <p className="page-description">
            Every account you track, and what is in it.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowTransfer(true)}
            disabled={accounts.length < 2}
          >
            <i className="fa-solid fa-right-left" />
            Transfer
          </button>

          <button type="button" className="primary-button" onClick={openNew}>
            <i className="fa-solid fa-plus" />
            Add account
          </button>
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
            <span className="text-red-500">
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
              <button
                type="button"
                className="primary-button"
                onClick={openNew}
              >
                Add your first account
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {accounts.map((account, index) => {
              const balance = accountBalance(account, transactions);
              const isCredit = account.type === "credit";
              const limit = Math.max(0, Number(account.creditLimit) || 0);
              const debt = Math.max(0, balance);
              const utilization = limit > 0 ? (debt / limit) * 100 : 0;

              return (
                <div key={account.id} className="account-card">
                  <ReorderButtons
                    index={index}
                    total={accounts.length}
                    onMove={move}
                  />

                  <div className="account-icon">
                    <i
                      className={`fa-solid ${TYPE_ICONS[account.type] || "fa-wallet"}`}
                    />
                  </div>

                  <div className="account-main">
                    <p className="account-name">{account.name}</p>

                    <p className="account-meta">
                      <span className="capitalize">{account.type}</span>
                      {account.institution
                        ? ` \u00b7 ${account.institution}`
                        : ""}
                      {account.lastFour
                        ? ` \u00b7 ends ${account.lastFour}`
                        : ""}
                    </p>
                  </div>

                  <div className="account-figures">
                    <p
                      className={`account-balance ${
                        isCredit
                          ? debt > 0
                            ? "text-red-500"
                            : "text-emerald-600"
                          : balance >= 0
                            ? ""
                            : "text-red-500"
                      }`}
                    >
                      {fmt(balance)}
                    </p>

                    {isCredit && (
                      <p className="account-figures-note">
                        {debt > 0 ? "owing" : "paid off"}
                      </p>
                    )}
                  </div>

                  {(!isCredit || (isCredit && limit > 0)) && (
                    <div className="account-extra">
                      {!isCredit && (
                        <label className="include-toggle">
                          <input
                            type="checkbox"
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

                          <p className="account-extra-note">
                            {fmt(availableCredit(account, transactions))}{" "}
                            available of {fmt(limit)}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="account-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => openEdit(account)}
                      aria-label="Edit"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>

                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => setConfirming(account)}
                      aria-label="Delete"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
                <span className="font-semibold text-red-600">
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
