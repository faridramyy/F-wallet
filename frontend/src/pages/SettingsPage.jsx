import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  Bell,
  LogOut,
  Palette,
  RefreshCw,
  Save,
  UserRound,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Field } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { useNotifications } from "../components/providers/useNotifications";
import { createApi } from "../lib/api";
import { getCognitoLogoutUrl } from "../lib/authConfig";
import { CURRENCY_OPTIONS } from "../lib/options";

const notificationOptions = [
  {
    key: "notify_recurring_reminders",
    title: "Recurring transaction reminders",
    description: "Get notified when recurring transactions are approaching.",
  },
  {
    key: "notify_budget_thresholds",
    title: "Budget threshold alerts",
    description: "Receive alerts when your spending reaches budget limits.",
  },
  {
    key: "notify_apple_pay_failures",
    title: "Apple Pay failures",
    description:
      "Get notified when an Apple Pay transaction cannot be processed.",
  },
  {
    key: "notify_unknown_cards",
    title: "Unknown cards",
    description: "Receive alerts when an unrecognized card is detected.",
  },
  {
    key: "notify_unmatched_accounts",
    title: "Unmatched accounts",
    description:
      "Get notified when a transaction cannot be matched to an account.",
  },
  {
    key: "notify_monthly_reports",
    title: "Monthly reports",
    description:
      "Receive a notification when your monthly financial report is ready.",
  },
];

const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Toronto",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Tokyo",
].map((zone) => ({ value: zone, label: zone }));

const DATE_FORMAT_OPTIONS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"].map(
  (format) => ({ value: format, label: format }),
);

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System default" },
];

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <div>
          <CardTitle className="font-semibold">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

// Fields the API manages itself; never sent back in a PATCH.
const READ_ONLY_FIELDS = new Set(["created_at", "updated_at"]);

export function SettingsPage({
  settings: savedSettings,
  onSaved,
  onThemePreview,
  onRetry,
}) {
  const auth = useAuth();
  const { toast } = useNotifications();

  // Editable draft. The saved settings live in AppDataProvider.
  const [settings, setSettings] = useState(savedSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Discard an unsaved theme preview when leaving the page.
  useEffect(() => () => onThemePreview(null), [onThemePreview]);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "theme") onThemePreview(value);
    setSaved(false);
  };

  // Props for a <Select> bound to settings[key].
  const bind = (key) => ({
    id: key,
    value: settings[key],
    onValueChange: (value) => updateSetting(key, value),
  });

  async function handleSave() {
    setSaving(true);

    try {
      const updates = Object.fromEntries(
        Object.entries(settings).filter(([key]) => !READ_ONLY_FIELDS.has(key)),
      );
      const { data } = await createApi(auth).patch("/settings", updates);

      setSettings(data.settings);
      onSaved(data.settings);
      onThemePreview(null);
      setSaved(true);
      toast.success("Your settings have been saved.");
    } catch (error) {
      toast.error(error.message || "Failed to save your settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await auth.removeUser();
      window.location.assign(getCognitoLogoutUrl());
    } catch {
      toast.error("Sign-out failed. Please try again.");
      setSigningOut(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          We couldn't load your settings.
        </p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <SettingsSection
        icon={UserRound}
        title="Account preferences"
        description="Your account information and regional preferences."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Currency" htmlFor="currency">
            <Select {...bind("currency")} options={CURRENCY_OPTIONS} />
          </Field>

          <Field label="Timezone" htmlFor="timezone">
            <Select {...bind("timezone")} options={TIMEZONE_OPTIONS} />
          </Field>

          <Field label="Date format" htmlFor="date_format">
            <Select {...bind("date_format")} options={DATE_FORMAT_OPTIONS} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Palette}
        title="Appearance"
        description="Customize how F-Wallet looks on your devices."
      >
        <Field label="Application theme" htmlFor="theme">
          <Select {...bind("theme")} options={THEME_OPTIONS} />
        </Field>
      </SettingsSection>

      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Choose which financial updates and alerts you want to receive."
      >
        <div className="divide-y divide-border">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p id={`${option.key}-label`} className="text-sm font-medium">
                  {option.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              </div>

              <Switch
                aria-labelledby={`${option.key}-label`}
                checked={Boolean(settings[option.key])}
                onCheckedChange={(value) => updateSetting(option.key, value)}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={RefreshCw}
        title="Recurring transactions"
        description="Configure how far ahead recurring transactions are generated."
      >
        <Field
          label="Generation window"
          htmlFor="recurring_generation_window_days"
          hint="Number of days ahead to generate upcoming recurring transactions."
        >
          <div className="relative">
            <Input
              id="recurring_generation_window_days"
              type="number"
              min="1"
              max="90"
              value={settings.recurring_generation_window_days}
              onChange={(event) =>
                updateSetting(
                  "recurring_generation_window_days",
                  Math.min(90, Math.max(1, Number(event.target.value))),
                )
              }
              className="pr-14"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              days
            </span>
          </div>
        </Field>
      </SettingsSection>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <Button
          variant="destructive"
          size="lg"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut />
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>

        <Button size="lg" onClick={handleSave} disabled={saving}>
          <Save />
          {saving ? "Saving..." : saved ? "Changes saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
