import { useMemo, useState } from "react";

import { fold } from "../lib/format";

/*
  One autosuggest for the whole app.

  This existed twice before, once on the shopping list and once on the
  price form, with the same matching rules written out separately. Item
  and store names have to stay consistent for the trip planner to match
  them, so this is less of a convenience than it looks: it is what keeps
  the data tidy enough to be useful.
*/

const MIN_CHARACTERS = 2;
const MAX_SUGGESTIONS = 5;

/*
  Names that start with what was typed come before names that merely
  contain it. Typing "no" should offer No Frills before Sobeys Northgate.
*/

export function matchSuggestions(options, term) {
  const needle = fold(String(term || "").trim());

  // Nothing until two characters. Dropping a panel over the form the
  // instant a field is focused hides what the user is working on, and a
  // single letter matches too much to be worth reading.
  if (needle.length < MIN_CHARACTERS) return [];

  const starts = [];
  const contains = [];

  for (const option of options) {
    const label = typeof option === "string" ? option : option.name;
    const folded = fold(label);

    if (folded === needle) continue;

    if (folded.startsWith(needle)) starts.push(option);
    else if (folded.includes(needle)) contains.push(option);
  }

  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

/*
  Distinct values for a field, most frequently used first.

  Grouped case and accent insensitively so one shop does not appear
  twice, but the spelling suggested back is the one originally typed.
*/

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

/*
  A text input with a suggestion list under it.

  `options` accepts plain strings, or objects of { name, meta } when
  there is something worth showing alongside the name, such as the
  cheapest price seen for an item.
*/

export function SuggestInput({
  value,
  onChange,
  options,
  placeholder,
  className = "input",
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
    <div className="suggest-field">
      <input
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
        <ul className="suggest-list">
          {suggestions.map((option) => {
            const label = typeof option === "string" ? option : option.name;
            const meta = typeof option === "string" ? null : option.meta;

            return (
              <li key={label}>
                {/*
                  onMouseDown rather than onClick: blur fires first on a
                  click, which would unmount the list before the
                  selection registered.
                */}
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(option);
                  }}
                >
                  <span className="suggest-name">{label}</span>
                  {meta && <span className="suggest-meta">{meta}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
