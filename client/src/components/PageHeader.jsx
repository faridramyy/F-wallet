/**
 * Standard page header: a small uppercase "eyebrow" label, the page title,
 * a one-line description, and an optional cluster of actions (buttons,
 * a MonthPicker, etc.) that sits to the right on larger screens.
 *
 * This was previously copy-pasted, with small drift between copies, at the
 * top of every page (Dashboard, Accounts, Categories, Transactions,
 * Groceries, Settings). Extracted so the six pages can't quietly diverge.
 */

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {actions && (
        <div className="flex items-center justify-end gap-2 sm:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
