import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { LogOut } from "lucide-react";
import { cn } from "cn";

import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  SettingRow,
  SettingsGroup,
} from "../components/settings/SettingsGroup";
import { ThemePicker } from "../components/settings/ThemePicker";
import { useNotifications } from "../components/providers/useNotifications";
import { createApi } from "../lib/api";
import { getCognitoLogoutUrl } from "../lib/authConfig";
import { hasChanges } from "../lib/dialogs";
import { CURRENCY_OPTIONS } from "../lib/options";
import { getDisplayName } from "../lib/user";

const NOTIFICATIONS = [
  {
    key: "notify_recurring_reminders",
    title: "Recurring transaction reminders",
    description: "When a recurring transaction is coming up.",
  },
  {
    key: "notify_budget_thresholds",
    title: "Budget alerts",
    description: "When your spending gets close to a budget limit.",
  },
  {
    key: "notify_apple_pay_failures",
    title: "Apple Pay failures",
    description: "When an Apple Pay transaction cannot be recorded.",
  },
  {
    key: "notify_unknown_cards",
    title: "Unknown cards",
    description: "When a card F-Wallet does not recognize is used.",
  },
  {
    key: "notify_unmatched_accounts",
    title: "Unmatched accounts",
    description: "When a transaction cannot be matched to an account.",
  },
  {
    key: "notify_monthly_reports",
    title: "Monthly reports",
    description: "When your monthly report is ready.",
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
].map((zone) => ({ value: zone, label: zone.replace("_", " ") }));

const DATE_FORMAT_OPTIONS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"].map(
  (format) => ({ value: format, label: format }),
);

// Fields the API manages itself; never sent back in a PATCH.
const READ_ONLY_FIELDS = new Set(["created_at", "updated_at"]);

const SELECT_WIDTH = "w-full sm:w-64";

// Who is signed in, with the sign-out button.
function ProfileCard() {
  const auth = useAuth();
  const { toast } = useNotifications();
  const [signingOut, setSigningOut] = useState(false);

  const profile = auth.user?.profile;
  const name = getDisplayName(profile);

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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-center">
      <Avatar name={name} className="size-12 text-base" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{profile?.email ?? name}</p>
        <p className="text-xs text-muted-foreground">
          Signed in with AWS Cognito
        </p>
      </div>

      <Button
        variant="destructive"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut />
        {signingOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}

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

  // Discard an unsaved theme preview when leaving the page.
  useEffect(() => () => onThemePreview(null), [onThemePreview]);

  const isDirty = hasChanges(settings, savedSettings);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "theme") onThemePreview(value);
  };

  // Props for a <Select> bound to settings[key].
  const bind = (key) => ({
    id: key,
    value: settings[key],
    onValueChange: (value) => updateSetting(key, value),
  });

  function handleDiscard() {
    setSettings(savedSettings);
    onThemePreview(null);
  }

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
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error.message || "Failed to save your settings.");
    } finally {
      setSaving(false);
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
    <div className="mx-auto max-w-3xl space-y-8">
      <ProfileCard />

      <SettingsGroup title="General" description="Money and dates.">
        <SettingRow
          label="Currency"
          description="Used for totals, charts and budgets."
          htmlFor="currency"
        >
          <Select
            {...bind("currency")}
            options={CURRENCY_OPTIONS}
            className={SELECT_WIDTH}
          />
        </SettingRow>

        <SettingRow
          label="Timezone"
          description="Decides which day a transaction falls on."
          htmlFor="timezone"
        >
          <Select
            {...bind("timezone")}
            options={TIMEZONE_OPTIONS}
            className={SELECT_WIDTH}
          />
        </SettingRow>

        <SettingRow
          label="Date format"
          description="How dates are written."
          htmlFor="date_format"
        >
          <Select
            {...bind("date_format")}
            options={DATE_FORMAT_OPTIONS}
            className={SELECT_WIDTH}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <SettingRow
          label="Theme"
          description="Light, dark, or match your device."
          labelId="theme-label"
        >
          <ThemePicker
            value={settings.theme}
            onChange={(theme) => updateSetting("theme", theme)}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        title="Notifications"
        description="Choose what F-Wallet tells you about."
      >
        {NOTIFICATIONS.map((item) => (
          <SettingRow
            key={item.key}
            label={item.title}
            description={item.description}
            labelId={`${item.key}-label`}
            className="flex-row items-center justify-between"
          >
            <Switch
              aria-labelledby={`${item.key}-label`}
              checked={Boolean(settings[item.key])}
              onCheckedChange={(value) => updateSetting(item.key, value)}
            />
          </SettingRow>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Recurring transactions">
        <SettingRow
          label="Create ahead"
          description="How many days ahead upcoming recurring transactions are created (1–90)."
          htmlFor="recurring_generation_window_days"
        >
          <div className="relative w-32">
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
              className="pr-12 tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              days
            </span>
          </div>
        </SettingRow>
      </SettingsGroup>

      {/* Appears only with unsaved changes; stays above the phone nav bar. */}
      <div
        aria-hidden={!isDirty}
        className={cn(
          "sticky bottom-28 z-20 flex items-center justify-between gap-3 rounded-xl border border-border bg-popover p-3 pl-4 text-popover-foreground shadow-lg transition-all duration-200 md:bottom-6",
          isDirty
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <p className="text-sm font-medium">You have unsaved changes</p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            onClick={handleDiscard}
            disabled={saving}
            tabIndex={isDirty ? 0 : -1}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            tabIndex={isDirty ? 0 : -1}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
