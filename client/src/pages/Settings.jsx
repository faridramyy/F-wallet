import { useState } from "react";

import { useApp } from "../store";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
  const [shareDays, setShareDays] = useState("7");
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration
        </p>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferences, backups and API access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => updateSettings({ currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => updateSettings({ theme: value })}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Match my device</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            These are stored with your data, so they follow you to any device
            you sign in on. Matching your device means the app switches with
            your phone or laptop, including when it changes on its own in the
            evening.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>What is currently stored</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Accounts", accounts.length],
              ["Categories", categories.length],
              ["Transactions", transactions.length],
              ["Price entries", groceries.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1 text-xl font-bold tracking-tight">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            className="mt-4"
            onClick={downloadBackup}
            disabled={exporting}
          >
            <i className="fa-solid fa-download" />
            {exporting ? "Preparing..." : "Download a backup"}
          </Button>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Downloads the same JSON shape the old version used, so nothing is
            locked in.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API access</CardTitle>
          <CardDescription>Add transactions from anywhere</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Send a POST request with your API key in the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              x-api-key
            </code>{" "}
            header. Accounts and categories can be given by name instead of id,
            so a phone shortcut only needs to know what you call things.
          </p>

          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            {curlExample}
          </pre>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            The key only allows creating transactions. It cannot read your
            balances, edit history or delete anything. Your API key lives in the
            Lambda environment variables, not in this page, so it is never
            exposed to the browser.
          </p>
        </CardContent>
      </Card>

      {!isViewer && (
        <Card>
          <CardHeader>
            <CardTitle>Read only access</CardTitle>
            <CardDescription>
              Let someone see your finances without changing anything
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A share link signs someone in as a read only user. They see
              everything you see, including the add and edit buttons, but any
              attempt to change something is refused by the server.
            </p>

            <div className="mt-4 max-w-xs space-y-2">
              <Label htmlFor="share-days">Link valid for</Label>
              <Select value={shareDays} onValueChange={setShareDays}>
                <SelectTrigger id="share-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="mt-3" onClick={makeShareLink} disabled={sharing}>
              <i className="fa-solid fa-link" />
              {sharing ? "Creating..." : "Create share link"}
            </Button>

            {shareLink && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted p-2">
                <Input readOnly value={shareLink} className="text-xs" />
                <Button variant="secondary" size="sm" onClick={copyShareLink}>
                  <i className="fa-solid fa-copy" />
                  Copy
                </Button>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Anyone with the link gets access until it expires, so treat it
              like a password. There is no way to revoke a single link short of
              changing JWT_SECRET, which signs everyone out. Prefer short
              expiries.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>
            <i className="fa-solid fa-arrow-right-from-bracket" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
