import { useMemo, useState } from "react";

import { fold } from "../lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

const MIN_CHARACTERS = 1; // Changed from 2 to allow single-character search
const MAX_SUGGESTIONS = 5;

export function matchSuggestions(options, term) {
  const needle = fold(String(term || "").trim());

  if (needle.length < MIN_CHARACTERS) return [];

  const starts = [];
  const contains = [];

  for (const option of options) {
    const label = typeof option === "string" ? option : option.name;
    const folded = fold(label);

    // Removed: if (folded === needle) continue;
    // Keeping exact matches allows suggestions to stay visible when full word is typed

    if (folded.startsWith(needle)) starts.push(option);
    else if (folded.includes(needle)) contains.push(option);
  }

  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

export function distinctValues(entries, key, ignore = []) {
  const counts = new Map();

  for (const entry of entries) {
    const value = String(entry[key] || "").trim();

    if (!value || ignore.includes(value)) continue;

    const folded = fold(value);
    const existing = counts.get(folded);

    counts.set(folded, {
      value: existing?.value || value,
      count: (existing?.count || 0) + 1,
    });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.value);
}

export function SuggestInput({
  value,
  onChange,
  options,
  placeholder,
  className,
  autoFocus = false,
  onEnter,
  ...rest
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => matchSuggestions(options, value),
    [options, value],
  );

  const pick = (option) => {
    onChange(typeof option === "string" ? option : option.name);
    setFocused(false);
  };

  return (
    <div className="relative">
      <Input
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setFocused(false);
          if (event.key === "Enter" && onEnter) onEnter();
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        {...rest}
      />

      {focused && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-3xl bg-popover shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10">
          {suggestions.map((option) => {
            const label = typeof option === "string" ? option : option.name;
            const meta = typeof option === "string" ? null : option.meta;

            return (
              <li
                key={label}
                className="border-t border-border first:border-t-0"
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-accent",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(option);
                  }}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-popover-foreground">
                    {label}
                  </span>

                  {meta && (
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {meta}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
