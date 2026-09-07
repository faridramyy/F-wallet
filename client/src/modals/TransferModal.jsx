import { useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { accountBalance } from "../lib/calc";
import { money, today } from "../lib/format";

export default function TransferModal({ transfer, onClose }) {
  const { accounts, transactions, currency, createTransaction, updateTransaction } = useApp();

  const isEditing = Boolean(transfer);

  const [form, setForm] = useState({
    fromAccountId: transfer?.fromAccountId || accounts[0]?.id || "",
    toAccountId: transfer?.toAccountId || accounts[1]?.id || "",
    amount: transfer?.amount ?? "",
    date: transfer?.date || today(),
    notes: transfer?.notes || "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fmt = (value) => money(value, { currency });

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const swap = () =>
    setForm((current) => ({ ...current, fromAccountId: current.toAccountId, toAccountId: current.fromAccountId }));

  const submit = async () => {
    setError("");

    const amount = Number(form.amount || 0);

    if (!(amount > 0)) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!form.fromAccountId || !form.toAccountId) {
      setError("Choose both accounts.");
      return;
    }

    if (form.fromAccountId === form.toAccountId) {
      setError("Pick two different accounts.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        type: "transfer",
        amount,
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        date: form.date,
        notes: form.notes.trim(),
      };

      if (isEditing) {
        await updateTransaction(transfer.id, payload);
      } else {
        await createTransaction(payload);
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
    }
  };

  const describe = (accountId) => {
    const account = accounts.find((item) => item.id === accountId);

    if (!account) return "";

    const balance = accountBalance(account, transactions);

    return account.type === "credit" ? `${fmt(balance)} owing` : `${fmt(balance)} available`;
  };

  return (
    <Modal
      title={isEditing ? "Edit transfer" : "Transfer money"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="primary-button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save changes" : "Transfer"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="From" className="sm:col-span-2">
          <select className="input" value={form.fromAccountId} onChange={set("fromAccountId")}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <p className="mt-1 text-[11px] text-slate-400">{describe(form.fromAccountId)}</p>
        </Field>

        <div className="flex justify-center sm:col-span-2">
          <button type="button" className="icon-button" onClick={swap} aria-label="Swap accounts">
            <i className="fa-solid fa-arrow-down-up-across-line" />
          </button>
        </div>

        <Field label="To" className="sm:col-span-2">
          <select className="input" value={form.toAccountId} onChange={set("toAccountId")}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <p className="mt-1 text-[11px] text-slate-400">{describe(form.toAccountId)}</p>
        </Field>

        <Field label="Amount">
          <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={set("amount")} placeholder="0.00" />
        </Field>

        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={set("date")} />
        </Field>

        <Field label="Note" className="sm:col-span-2">
          <input className="input" value={form.notes} onChange={set("notes")} placeholder="Optional" />
        </Field>

        <p className="text-[11px] leading-relaxed text-slate-400 sm:col-span-2">
          Paying a credit card is a transfer from your chequing account to the card. The card balance goes down and your
          cash goes down with it.
        </p>

        {error && (
          <div className="sm:col-span-2">
            <p className="form-error">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
