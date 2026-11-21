import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  UserRound,
  Palette,
  Bell,
  RefreshCw,
  Save,
  LogOut,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "../components/ui/card";
import { apiRequest } from "../lib/api";
import { useNotifications } from "../components/providers/useNotifications";
import SettingsSkeleton from "../skeletons/SettingsSkeleton";

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

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={19} strokeWidth={1.8} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-card-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, description, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>

      {children}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring";

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-primary-foreground shadow-sm transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function SettingsPage({ onThemeChange }) {
  const auth = useAuth();
  const { toast } = useNotifications();

  const [settings, setSettings] = useState(null);
  const [persistedSettings, setPersistedSettings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const response = await apiRequest("/settings", auth);

      const loadedSettings = response.data.settings;

      setSettings(loadedSettings);
      setPersistedSettings(loadedSettings);
      onThemeChange(loadedSettings.theme);
      setSaved(false);
    } catch (error) {
      console.error("Failed to load settings:", error);
      setLoadError(true);
      toast.error(error.message || "Failed to load your settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest("/settings", auth)
      .then((response) => {
        const loadedSettings = response.data.settings;

        setSettings(loadedSettings);
        setPersistedSettings(loadedSettings);
        onThemeChange(loadedSettings.theme);
        setSaved(false);
      })
      .catch((error) => {
        console.error("Failed to load settings:", error);
        setLoadError(true);
        toast.error(error.message || "Failed to load your settings.");
      })
      .finally(() => {
        setLoading(false);
      });

    // Settings are loaded once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "theme") {
      onThemeChange(value);
    }

    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings || saving) return;

    try {
      setSaving(true);

      const updates = Object.fromEntries(
        Object.entries(settings).filter(
          ([key]) => key !== "created_at" && key !== "updated_at",
        ),
      );

      const response = await apiRequest("/settings", auth, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      const updatedSettings = response.data.settings;

      setSettings(updatedSettings);
      setPersistedSettings(updatedSettings);
      onThemeChange(updatedSettings.theme);
      setSaved(true);

      toast.success("Your settings have been saved.");
    } catch (error) {
      console.error("Failed to save settings:", error);

      if (persistedSettings) {
        onThemeChange(persistedSettings.theme);
        setSettings((current) => ({
          ...current,
          theme: persistedSettings.theme,
        }));
      }

      toast.error(error.message || "Failed to save your settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);

      await auth.removeUser();

      const logoutUrl = new URL(
        "https://ca-central-1vntwkf99n.auth.ca-central-1.amazoncognito.com/logout",
      );

      logoutUrl.searchParams.set(
        "client_id",
        import.meta.env.VITE_COGNITO_CLIENT_ID,
      );

      logoutUrl.searchParams.set("logout_uri", `${window.location.origin}/`);

      window.location.assign(logoutUrl.toString());
    } catch (error) {
      console.error("Sign-out failed:", error);
      toast.error("Sign-out failed. Please try again.");
      setSigningOut(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (loadError || !settings) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          We couldn't load your settings.
        </p>

        <button
          type="button"
          onClick={loadSettings}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Account preferences */}
      <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="pb-2">
          <SectionHeading
            icon={UserRound}
            title="Account preferences"
            description="Your account information and regional preferences."
          />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Currency">
              <select
                value={settings.currency}
                onChange={(e) => updateSetting("currency", e.target.value)}
                className={inputClass}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="AUD">AUD — Australian Dollar</option>
              </select>
            </Field>

            <Field label="Timezone">
              <select
                value={settings.timezone}
                onChange={(e) => updateSetting("timezone", e.target.value)}
                className={inputClass}
              >
                <option value="America/New_York">America/New_York</option>
                <option value="America/Toronto">America/Toronto</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </Field>

            <Field label="Date format">
              <select
                value={settings.date_format}
                onChange={(e) => updateSetting("date_format", e.target.value)}
                className={inputClass}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              </select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="pb-2">
          <SectionHeading
            icon={Palette}
            title="Appearance"
            description="Customize how F-Wallet looks on your devices."
          />
        </CardHeader>

        <CardContent>
          <Field label="Application theme">
            <select
              value={settings.theme}
              onChange={(e) => updateSetting("theme", e.target.value)}
              className={inputClass}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System default</option>
            </select>
          </Field>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="pb-2">
          <SectionHeading
            icon={Bell}
            title="Notifications"
            description="Choose which financial updates and alerts you want to receive."
          />
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-border">
            {notificationOptions.map((option) => (
              <div
                key={option.key}
                className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {option.title}
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                <Toggle
                  checked={settings[option.key]}
                  onChange={(value) => updateSetting(option.key, value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recurring transactions */}
      <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="pb-2">
          <SectionHeading
            icon={RefreshCw}
            title="Recurring transactions"
            description="Configure how far ahead recurring transactions are generated."
          />
        </CardHeader>

        <CardContent>
          <Field
            label="Generation window"
            description="Number of days ahead to generate upcoming recurring transactions."
          >
            <div className="relative">
              <input
                type="number"
                min="1"
                max="90"
                value={settings.recurring_generation_window_days}
                onChange={(e) =>
                  updateSetting(
                    "recurring_generation_window_days",
                    Math.min(90, Math.max(1, Number(e.target.value))),
                  )
                }
                className={`${inputClass} pr-16`}
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                days
              </span>
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut || auth.isLoading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <LogOut size={16} />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Save size={16} />
          {saving ? "Saving..." : saved ? "Changes saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
