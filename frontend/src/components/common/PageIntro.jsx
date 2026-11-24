// Short description under the app header, with the page's main action.
// The page title itself is already shown by AppHeader.
export function PageIntro({ description, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">{description}</p>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}
