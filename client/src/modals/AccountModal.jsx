import { useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { accountBalance } from "../lib/calc";
import { round2 } from "../lib/format";

const TYPES = [
  { value: "chequing", label: "Chequing" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit card" },
];

export default function AccountModal({ account, onClose }) {
  const { transactions, createAccount, updateAccount } = useApp();

  const isEditing = Boolean(account);

  const existingBalance = isEditing ? round2(accountBalance(account, transactions)) : 0;

  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "chequing",
    institution: account?.institution || "",
    lastFour: account?.lastFour || "",
    startingBalance: account?.startingBalance ?? "",
    creditLimit: account?.creditLimit ?? "",
    currentBalance: isEditing && account.type === "credit" ? String(existingBalance) : "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setError("");

    if (!form.name.trim()) {
      setError("Account name is required.");
      return;
    }

    const startingBalanceInput = Number(form.startingBalance || 0);

    if (!Number.isFinite(startingBalanceInput) || startingBalanceInput < 0) {
      setError("Starting balance must be a valid number.");
      return;
    }

    if (form.lastFour && !/^\d{4}$/.test(form.lastFour)) {
      setError("Last four digits must be exactly four numbers.");
      return;
    }

    const creditLimit = Number(form.creditLimit || 0);

    if (form.type === "credit" && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
      setError("Credit limit cannot be negative.");
      return;
    }

    let startingBalance = startingBalanceInput;

    /*
      Editing a credit card's current balance is the fiddly bit, and it
      works exactly as it did before. Rather than deleting history, the
      starting debt shifts by the difference so the computed balance lands
      on whatever number was typed.
    */

    if (isEditing && form.type === "credit" && form.currentBalance !== "") {
      const desired = Number(form.currentBalance);

      if (!Number.isFinite(desired)) {
        setError("Current balance must be a valid number.");
        return;
      }

      if (round2(desired) !== existingBalance) {
        const transactionEffect = accountBalance(account, transactions) - (Number(account.startingBalance) || 0);

        startingBalance = round2(desired - transactionEffect);
      }
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      institution: form.institution.trim(),
      lastFour: form.lastFour.trim(),
      startingBalance,
      ...(form.type === "credit" ? { creditLimit } : {}),
    };

    setSaving(true);

    try {
      if (isEditing) {
        await updateAccount(account.id, payload);
      } else {
        await createAccount(payload);
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit account" : "Add account"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="primary-button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save changes" : "Add account"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Account name" className="sm:col-span-2">
          <input className="input" value={form.name} onChange={set("name")} placeholder="Everyday chequing" autoFocus />
        </Field>

        <Field label="Type">
          <select className="input" value={form.type} onChange={set("type")}>
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Institution">
          <input className="input" value={form.institution} onChange={set("institution")} placeholder="RBC" />
        </Field>

        <Field label="Last 4 digits">
          <input className="input" value={form.lastFour} onChange={set("lastFour")} inputMode="numeric" maxLength={4} placeholder="4321" />
        </Field>

        <Field label={form.type === "credit" ? "Starting debt" : "Starting balance"}>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.startingBalance}
            onChange={set("startingBalance")}
            placeholder="0.00"
          />
        </Field>

        {form.type === "credit" && (
          <>
            <Field label="Credit limit">
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.creditLimit}
                onChange={set("creditLimit")}
                placeholder="5000.00"
              />
            </Field>

            {isEditing && (
              <Field label="Current balance owing" className="sm:col-span-2">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.currentBalance}
                  onChange={set("currentBalance")}
                />

                <p className="mt-1 text-[11px] text-slate-400">
                  Set this to match your statement. Your transactions are kept and the starting debt is adjusted to fit.
                </p>
              </Field>
            )}
          </>
        )}

        {error && (
          <div className="sm:col-span-2">
            <p className="form-error">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
