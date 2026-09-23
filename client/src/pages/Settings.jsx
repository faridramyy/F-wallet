import { useState } from "react";
import {
  Download,
  Link as LinkIcon,
  Copy,
  LogOut,
  Check,
  Wallet,
  FolderKanban,
  Receipt,
  ShoppingCart,
  Database,
  Sliders,
  Key,
  Eye,
  ShieldAlert,
} from "lucide-react";

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
  SelectGroup,
  SelectItem,
  SelectLabel,
} from "@/components/ui/select";

const FIAT_CURRENCIES = ["CAD", "USD", "EUR", "GBP"];
const REGIONAL_CURRENCIES = ["EGP", "AED"];

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
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      showToast("Link copied.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast(
        "Could not copy. Select the link and copy it manually.",
        "error",
      );
    }
  };

  const stats = [
    {
      label: "Accounts",
      value: accounts.length,
      icon: Wallet,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Categories",
      value: categories.length,
      icon: FolderKanban,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Transactions",
      value: transactions.length,
      icon: Receipt,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Price Entries",
      value: groceries.length,
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

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
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Preferences</CardTitle>
              <CardDescription className="text-xs">
                Display and regional settings
              </CardDescription>
            </div>
          </div>
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
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Major Currencies</SelectLabel>
                    {FIAT_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Regional Currencies</SelectLabel>
                    {REGIONAL_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
                  <SelectValue placeholder="Select theme" />
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

      <Card className="overflow-hidden border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Your Data</CardTitle>
              <CardDescription className="text-xs">
                Overview of your stored information and records
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </span>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl font-bold tracking-tight">
                      {stat.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-start gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">
                Data Portability
              </p>
              <p className="text-[11px] text-muted-foreground">
                Export a complete JSON backup of your records at any time.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs hover:bg-accent"
              onClick={downloadBackup}
              disabled={exporting}
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              {exporting ? "Preparing..." : "Download Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">API Access</CardTitle>
              <CardDescription className="text-xs">
                Add transactions programmatically
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Send a POST request with your API key in the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              x-api-key
            </code>{" "}
            header. Accounts and categories can be given by name instead of id,
            so a phone shortcut only needs to know what you call things.
          </p>

          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
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
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  Read Only Access
                </CardTitle>
                <CardDescription className="text-xs">
                  Grant view access without edit permissions
                </CardDescription>
              </div>
            </div>
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

            <Button
              className="mt-3 gap-2"
              onClick={makeShareLink}
              disabled={sharing}
            >
              <LinkIcon className="h-4 w-4" />
              {sharing ? "Creating..." : "Create share link"}
            </Button>

            {shareLink && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted p-2">
                <Input
                  readOnly
                  value={shareLink}
                  className="text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={copyShareLink}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
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
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Session</CardTitle>
              <CardDescription className="text-xs">
                Manage your active account login
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
