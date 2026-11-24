import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, CornerDownRight } from "lucide-react";
import { cn } from "cn";

// A dropdown list that supports sections and parent/child rows.
//
//   options: an array of
//     { value, label, icon?, description?, depth?, disabled? }   an option
//     { section: "Credit cards", options: [...] }                  a section
//   depth: 0 for a parent, 1+ for its children (indented under it)
//
// Values are strings; "" is the "nothing selected" option (e.g. "No parent").

const NONE = null; // Base UI's value for "nothing selected"

const toInternal = (value) => (value === "" || value == null ? NONE : value);

// Every option, sections flattened, for looking up the selected one.
const flatten = (options) =>
  options.flatMap((entry) => ("section" in entry ? entry.options : [entry]));

function OptionIcon({ icon: Icon, className }) {
  if (!Icon) return null;
  return (
    <Icon
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}

function SelectOption({ option }) {
  const depth = option.depth ?? 0;

  return (
    <SelectPrimitive.Item
      value={toInternal(option.value)}
      disabled={option.disabled}
      className="relative flex cursor-default items-center gap-2 rounded-md py-2 pr-8 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
      style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
    >
      {depth > 0 && (
        <CornerDownRight
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground/70"
        />
      )}

      <OptionIcon icon={option.icon} />

      <span className="min-w-0 flex-1">
        <SelectPrimitive.ItemText
          className={cn(
            "block truncate",
            depth === 0 && option.parent && "font-medium",
          )}
        >
          {option.label}
        </SelectPrimitive.ItemText>
        {option.description && (
          <span className="block truncate text-xs text-muted-foreground">
            {option.description}
          </span>
        )}
      </span>

      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled = false,
  className,
  "aria-label": ariaLabel,
}) {
  const flat = flatten(options);
  const selected = flat.find(
    (option) => toInternal(option.value) === toInternal(value),
  );

  return (
    <SelectPrimitive.Root
      value={toInternal(value)}
      onValueChange={(next) => onValueChange(next ?? "")}
      disabled={disabled}
      // Lets the trigger show the label of the chosen option.
      items={flat.map((option) => ({
        value: toInternal(option.value),
        label: option.label,
      }))}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-popup-open:border-ring md:text-sm dark:bg-input/30",
          className,
        )}
      >
        <OptionIcon icon={selected?.icon} />
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground"
        />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          className="z-50 outline-none"
          sideOffset={4}
          alignItemWithTrigger={false}
        >
          <SelectPrimitive.Popup className="max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
            <SelectPrimitive.List>
              {options.map((entry, index) =>
                "section" in entry ? (
                  entry.options.length > 0 && (
                    <SelectPrimitive.Group
                      key={`section-${entry.section}`}
                      className={cn(
                        index > 0 && "mt-1 border-t border-border pt-1",
                      )}
                    >
                      <SelectPrimitive.GroupLabel className="px-2 pt-1.5 pb-1 text-2xs font-semibold tracking-widest text-muted-foreground uppercase">
                        {entry.section}
                      </SelectPrimitive.GroupLabel>
                      {entry.options.map((option) => (
                        <SelectOption key={option.value} option={option} />
                      ))}
                    </SelectPrimitive.Group>
                  )
                ) : (
                  <SelectOption key={entry.value || "none"} option={entry} />
                ),
              )}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
