import { useState } from "react";

import { useApp } from "../store";
import { Panel, Field } from "../components/ui";
import { api } from "../lib/api";

const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "EGP", "AED"];

export default function Settings() {
  const {
    settings,
    accounts,
    categories,
    transactions,
    groceries,
    updateSettings,
    showToast,
    logout,
    isViewer,
    createShareLink,
  } = useApp();

  const [exporting, setExporting] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareDays, setShareDays] = useState(7);
  const [sharing, setSharing] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "";

  const downloadBackup = async () => {
    setExporting(true);

    try {
      const data = await api.exportData();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `f-wallet-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();

      URL.revokeObjectURL(url);

      showToast("Backup downloaded.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setExporting(false);
    }
  };

  const makeShareLink = async () => {
    setSharing(true);

    try {
      const result = await createShareLink(Number(shareDays));

      // Built from the current address so it works on localhost and on
      // the deployed site without knowing either in advance.
      const base = `${window.location.origin}${window.location.pathname}`;

      setShareLink(`${base}#/share/${result.token}`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSharing(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);

      showToast("Link copied.", "success");
    } catch (error) {
      showToast(
        "Could not copy. Select the link and copy it manually.",
        "error",
      );
    }
  };

  const curlExample = `curl -X POST ${apiBase || "https://your-api-url"}/api/transactions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "type": "expense",
    "amount": 24.50,
    "account": "Visa",
    "category": "Groceries",
    "notes": "No Frills"
  }'`;

  return (
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2 className="page-title">Settings</h2>
          <p className="page-description">
            Preferences, backups and API access.
          </p>
        </div>
      </div>

      <Panel title="Preferences">
        <div className="form-grid">
          <Field label="Currency">
            <select
              className="input"
              value={settings.currency}
              onChange={(event) =>
                updateSettings({ currency: event.target.value })
              }
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Theme">
            <select
              className="input"
              value={settings.theme}
              onChange={(event) =>
                updateSettings({ theme: event.target.value })
              }
            >
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          These are stored with your data, so they follow you to any device you
          sign in on. Matching your device means the app switches with your
          phone or laptop, including when it changes on its own in the evening.
        </p>
      </Panel>

      <Panel title="Your data" subtitle="What is currently stored">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="stat-card">
            <div className="stat-label">Accounts</div>
            <div className="stat-value">{accounts.length}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Categories</div>
            <div className="stat-value">{categories.length}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Transactions</div>
            <div className="stat-value">{transactions.length}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Price entries</div>
            <div className="stat-value">{groceries.length}</div>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button mt-4"
          onClick={downloadBackup}
          disabled={exporting}
        >
          <i className="fa-solid fa-download" />
          {exporting ? "Preparing..." : "Download a backup"}
        </button>

        <p className="mt-2 text-[11px] text-slate-400">
          Downloads the same JSON shape the old version used, so nothing is
          locked in.
        </p>
      </Panel>

      <Panel title="API access" subtitle="Add transactions from anywhere">
        <p className="text-sm leading-relaxed text-slate-600">
          Send a POST request with your API key in the{" "}
          <code className="code-inline">x-api-key</code> header. Accounts and
          categories can be given by name instead of id, so a phone shortcut
          only needs to know what you call things.
        </p>

        <pre className="code-block">{curlExample}</pre>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          The key only allows creating transactions. It cannot read your
          balances, edit history or delete anything. Your API key lives in the
          Lambda environment variables, not in this page, so it is never exposed
          to the browser.
        </p>
      </Panel>

      {!isViewer && (
        <Panel
          title="Read only access"
          subtitle="Let someone see your finances without changing anything"
        >
          <p className="text-sm leading-relaxed text-slate-600">
            A share link signs someone in as a read only user. They see
            everything you see, including the add and edit buttons, but any
            attempt to change something is refused by the server.
          </p>

          <div className="form-grid mt-4">
            <Field label="Link valid for">
              <select
                className="input"
                value={shareDays}
                onChange={(event) => setShareDays(event.target.value)}
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </Field>
          </div>

          <button
            type="button"
            className="primary-button mt-3"
            onClick={makeShareLink}
            disabled={sharing}
          >
            <i className="fa-solid fa-link" />
            {sharing ? "Creating..." : "Create share link"}
          </button>

          {shareLink && (
            <div className="share-link-box">
              <code>{shareLink}</code>

              <button
                type="button"
                className="secondary-button"
                onClick={copyShareLink}
              >
                <i className="fa-solid fa-copy" />
                Copy
              </button>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Anyone with the link gets access until it expires, so treat it like
            a password. There is no way to revoke a single link short of
            changing JWT_SECRET, which signs everyone out. Prefer short
            expiries.
          </p>
        </Panel>
      )}

      <Panel title="Session">
        <button type="button" className="danger-button" onClick={logout}>
          <i className="fa-solid fa-arrow-right-from-bracket" />
          Sign out
        </button>
      </Panel>
    </div>
  );
}
