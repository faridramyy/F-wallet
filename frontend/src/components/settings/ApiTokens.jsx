import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Check, Copy, KeyRound, Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "cn";

import { FormDialog } from "../common/FormDialog";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Field } from "../ui/field";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { useNotifications } from "../providers/useNotifications";
import { useAppData } from "../providers/useAppData";
import { createApi } from "../../lib/api";
import { formatTimestamp } from "../../lib/formatters";
import { accountOptions, categoryOptions } from "../../lib/select-options";
import { buildShortcutPrompt } from "../../lib/shortcut-prompt";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Values are strings for the Select; "" means the token never expires.
const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "", label: "Never" },
];

// The JSON a script sends to add an expense, with the chosen account and
// category filled in.
const exampleBody = (accountId, categoryId) =>
  JSON.stringify(
    {
      transaction_type: "expense",
      account_id: accountId || "<account ID>",
      ...(categoryId && { category_id: categoryId }),
      amount_cents: 1299,
      transaction_date: new Date().toLocaleDateString("en-CA"),
      merchant: "Coffee shop",
    },
    null,
    2,
  );

// A phone can't reach the API at localhost: the Shortcut needs the deployed
// address.
const IS_LOCAL_API = /\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(
  API_BASE_URL ?? "",
);

const isExpired = (token) =>
  token.expires_at && new Date(token.expires_at) <= new Date();

function tokenStatus(token) {
  if (token.status === "revoked") return "Revoked";
  if (isExpired(token)) return "Expired";
  return null;
}

function tokenDetails(token) {
  const parts = [`Created ${formatTimestamp(token.created_at)}`];

  parts.push(
    token.last_used_at
      ? `Last used ${formatTimestamp(token.last_used_at)}`
      : "Never used",
  );

  if (token.status === "revoked") {
    parts.push(`Revoked ${formatTimestamp(token.revoked_at)}`);
  } else if (token.expires_at) {
    parts.push(
      `${isExpired(token) ? "Expired" : "Expires"} ${formatTimestamp(token.expires_at)}`,
    );
  } else {
    parts.push("No expiry");
  }

  return parts.join(" · ");
}

function CopyButton({ text, label }) {
  const { toast } = useNotifications();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  return (
    <IconButton
      label={copied ? "Copied" : label}
      icon={copied ? Check : Copy}
      onClick={handleCopy}
    />
  );
}

// A read-only value with a copy button, e.g. the new token or the URL.
function CopyField({ label, value, mono = true }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 py-1 pr-1 pl-3">
        <code
          className={cn(
            "min-w-0 flex-1 truncate text-sm select-all",
            !mono && "font-sans",
          )}
        >
          {value}
        </code>
        <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}

function CreateTokenDialog({ onClose, onCreated }) {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("90");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data } = await createApi(auth).post("/api-tokens", {
        token_name: name.trim(),
        expires_in_days: expiry ? Number(expiry) : null,
      });
      onCreated(data);
    } catch (requestError) {
      setError(requestError.message || "Couldn't create the token.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title="New API token"
      description="Lets a script, like an iPhone Shortcut, add transactions. It can't read or change anything else."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Create token"
      submitDisabled={!name.trim()}
      saving={saving}
      error={error}
    >
      <Field label="Name" htmlFor="token_name" hint="So you know what uses it.">
        <Input
          id="token_name"
          value={name}
          maxLength={100}
          placeholder="iPhone Shortcut"
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Expires after" htmlFor="token_expiry">
        <Select
          id="token_expiry"
          value={expiry}
          onValueChange={setExpiry}
          options={EXPIRY_OPTIONS}
        />
      </Field>
    </FormDialog>
  );
}

// Shown once, right after creating: the only time the token is visible.
function NewTokenDialog({ token, onClose }) {
  const { accounts, categories } = useAppData();
  const [accountId, setAccountId] = useState(accounts[0]?.account_id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const body = exampleBody(accountId, categoryId);
  const url = `${API_BASE_URL}/transactions`;
  const prompt = buildShortcutPrompt({
    url,
    token,
    accounts,
    categories,
    defaultAccountId: accountId,
    defaultCategoryId: categoryId,
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border p-5 pr-12">
          <DialogTitle className="text-lg font-semibold">
            Copy your token now
          </DialogTitle>
          <DialogDescription>
            You won't be able to see it again. Treat it like a password.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <CopyField label="Token" value={token} />

          <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
            <p className="font-medium">Add a transaction</p>
            <CopyField label="URL" value={url} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Method</dt>
              <dd>
                <code>POST</code>
              </dd>
              <dt className="text-muted-foreground">Authorization</dt>
              <dd className="min-w-0 truncate">
                <code>Bearer {token.slice(0, 7)}…</code>
              </dd>
              <dt className="text-muted-foreground">Idempotency-Key</dt>
              <dd>
                A new unique value per transaction (e.g. a UUID). Retrying with
                the same key never adds it twice.
              </dd>
            </dl>

            <p className="text-xs text-muted-foreground">
              Pick where the transaction goes to fill in the IDs below.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account" htmlFor="token_example_account">
                <Select
                  id="token_example_account"
                  value={accountId}
                  onValueChange={setAccountId}
                  options={accountOptions(accounts)}
                />
              </Field>
              <Field label="Category" htmlFor="token_example_category">
                <Select
                  id="token_example_category"
                  value={categoryId}
                  onValueChange={setCategoryId}
                  options={[
                    { value: "", label: "No category" },
                    {
                      section: "Expenses",
                      options: categoryOptions(categories, "expense"),
                    },
                  ]}
                />
              </Field>
            </div>

            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-muted p-3 pr-10 text-xs">
                {body}
              </pre>
              <div className="absolute top-1.5 right-1.5">
                <CopyButton text={body} label="Copy request body" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use <code>"income"</code> as the type to add income. Amounts are
              in cents: 1299 is 12.99.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-4 text-muted-foreground" />
                  Apple Pay Shortcut prompt
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paste this into Siri (or any AI assistant) to have it build a
                  Shortcut that records every Apple Pay payment. It has your
                  token, every account and category ID, and the account and
                  category picked above as defaults.
                </p>
              </div>
              <CopyButton text={prompt} label="Copy prompt" />
            </div>

            {IS_LOCAL_API && (
              <p className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                The API address is on this computer ({API_BASE_URL}), so your
                iPhone can't reach it. Use the deployed address in the Shortcut.
              </p>
            )}

            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {prompt}
            </pre>
            <p className="text-xs text-muted-foreground">
              The prompt contains your token. Only paste it on your own device.
            </p>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0">
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TokenRow({ token, onRevoke }) {
  const status = tokenStatus(token);

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <KeyRound
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0",
          status ? "text-muted-foreground/50" : "text-muted-foreground",
        )}
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "flex items-center gap-2 truncate text-sm font-medium",
            status && "text-muted-foreground",
          )}
        >
          <span className="truncate">{token.token_name}</span>
          {token.token_last_four && (
            <code
              className="shrink-0 text-xs font-normal text-muted-foreground"
              title="Last 4 characters of the token"
            >
              fw_…{token.token_last_four}
            </code>
          )}
          {status && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-normal">
              {status}
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {tokenDetails(token)}
        </p>
      </div>

      {token.status === "active" && (
        <IconButton
          label={`Revoke ${token.token_name}`}
          icon={Trash2}
          tone="destructive"
          onClick={() => onRevoke(token)}
        />
      )}
    </li>
  );
}

// Settings section: personal API tokens for scripts such as an iPhone
// Shortcut. Lists them, creates one (shown once) and revokes them.
export function ApiTokensSection() {
  const auth = useAuth();
  const { toast, confirm } = useNotifications();
  const [tokens, setTokens] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState(null);

  // Bumped by "Try again" to fetch the list again.
  const [attempt, setAttempt] = useState(0);
  const userId = auth.user?.profile?.sub;

  // Fetch when the signed-in user changes (not on every token renewal).
  useEffect(() => {
    let cancelled = false;

    createApi(auth)
      .get("/api-tokens")
      .then(({ data }) => !cancelled && setTokens(data.api_tokens))
      .catch(() => !cancelled && setLoadFailed(true));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attempt]);

  function handleRetry() {
    setLoadFailed(false);
    setAttempt((current) => current + 1);
  }

  function handleCreated({ api_token: created, token }) {
    setCreating(false);
    setTokens((current) => [created, ...(current ?? [])]);
    setNewToken(token);
  }

  async function handleRevoke(token) {
    const confirmed = await confirm({
      title: "Revoke token?",
      description: `Anything using "${token.token_name}" will stop working right away. This can't be undone.`,
      confirmText: "Revoke token",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const { data } = await createApi(auth).delete(
        `/api-tokens/${token.api_token_id}`,
      );
      setTokens((current) =>
        current.map((item) =>
          item.api_token_id === token.api_token_id ? data.api_token : item,
        ),
      );
      toast.success("Token revoked.");
    } catch (error) {
      toast.error(error.message || "Couldn't revoke the token.");
    }
  }

  let body;

  if (loadFailed) {
    body = (
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <p className="text-sm text-muted-foreground">
          We couldn't load your tokens.
        </p>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Try again
        </Button>
      </div>
    );
  } else if (!tokens) {
    body = (
      <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
        Loading…
      </p>
    );
  } else if (tokens.length === 0) {
    body = (
      <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
        No tokens yet. Create one to add transactions from an iPhone Shortcut or
        a script.
      </p>
    );
  } else {
    body = (
      <ul className="divide-y divide-border">
        {tokens.map((token) => (
          <TokenRow
            key={token.api_token_id}
            token={token}
            onRevoke={handleRevoke}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold">API tokens</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            For iPhone Shortcuts and scripts. A token can only add transactions.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => setCreating(true)}
        >
          <Plus />
          New token
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card text-card-foreground">
        {body}
      </div>

      {creating && (
        <CreateTokenDialog
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      )}

      {newToken && (
        <NewTokenDialog token={newToken} onClose={() => setNewToken(null)} />
      )}
    </section>
  );
}
