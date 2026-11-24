import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "cn";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// A compact Light / Dark / System switch. A radio group: arrow keys move
// between the choices.
export function ThemePicker({ value, onChange }) {
  function handleKeyDown(event) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      event.key
    ];
    if (!step) return;

    event.preventDefault();
    const index = THEMES.findIndex((theme) => theme.value === value);
    const next = THEMES[(index + step + THEMES.length) % THEMES.length];
    onChange(next.value);
    event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Application theme"
      onKeyDown={handleKeyDown}
      className="inline-flex gap-1 rounded-lg bg-muted p-1"
    >
      {THEMES.map(({ value: theme, label, icon: Icon }) => {
        const selected = value === theme;

        return (
          <button
            key={theme}
            type="button"
            role="radio"
            data-value={theme}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(theme)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
