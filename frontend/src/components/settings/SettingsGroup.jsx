import { cn } from "cn";

// A titled group of settings: a heading above one card of rows.
export function SettingsGroup({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
        {children}
      </div>
    </section>
  );
}

// One setting: its name and explanation on the left, the control on the
// right (below on phones).
//   htmlFor: the control's id, for inputs and selects
//   labelId: id for the name, for controls labelled by aria-labelledby
//            (switches, radio groups)
export function SettingRow({
  label,
  description,
  htmlFor,
  labelId,
  className,
  children,
}) {
  const LabelTag = htmlFor ? "label" : "p";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <LabelTag
          id={labelId}
          htmlFor={htmlFor}
          className="text-sm font-medium"
        >
          {label}
        </LabelTag>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}
