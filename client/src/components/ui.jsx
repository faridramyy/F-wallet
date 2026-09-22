import { useEffect, useRef, useState } from "react";

import { useApp } from "../store";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <Card className={className}>
      {(title || action) && (
        <CardHeader
          className={
            action ? "flex-row items-start justify-between gap-3" : undefined
          }
        >
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>

          {action}
        </CardHeader>
      )}

      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatCard({ label, value, help, tone = "", className = "" }) {
  // The new theme's --primary is a green hue and --destructive is red,
  // so "positive"/"negative" tones map directly onto tokens that already
  // exist rather than needing their own emerald-600/red-500 overrides.
  const toneClass =
    tone === "positive"
      ? "text-primary"
      : tone === "negative"
        ? "text-destructive"
        : "";

  return (
    <Card size="sm" className={className}>
      <CardContent>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>

        <div
          className={cn(
            "mt-1.5 truncate text-lg font-semibold tracking-tight sm:text-xl",
            toneClass,
          )}
        >
          {value}
        </div>

        {help && (
          <div className="mt-1 text-[10px] text-muted-foreground/70">
            {help}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Field({ label, error, children, className = "" }) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function EmptyState({ icon = "fa-inbox", title, message, action }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <i className={`fa-solid ${icon}`} />
      </div>

      <p className="text-sm font-semibold">{title}</p>

      {message && (
        <p className="mx-auto mt-1 max-w-82.5 text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
      )}

      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

/*
  The swipe-to-dismiss bottom sheet behaviour (touch drag, Escape key,
  body scroll lock) is plain JS, not tied to the old CSS classes, so it
  is carried over unchanged. Only the classNames were converted to the
  new tokens — introducing a Base UI Dialog here would mean
  reimplementing the swipe gesture on top of it for no real benefit.
*/

export function Modal({ title, onClose, children, footer, wide = false }) {
  const startY = useRef(null);

  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-25 flex items-end justify-center bg-foreground/50 animate-in fade-in duration-200 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-4xl bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom duration-300 sm:max-w-lg sm:rounded-4xl sm:zoom-in-95 sm:slide-in-from-bottom-0",
          wide && "sm:max-w-2xl",
        )}
        role="dialog"
        aria-modal="true"
        style={
          dragOffset
            ? {
                transform: `translateY(${dragOffset}px)`,
                animation: "none",
                transition: "none",
              }
            : undefined
        }
      >
        <div
          className="flex justify-center pb-1 pt-2.5 sm:hidden"
          onTouchStart={(event) => {
            startY.current = event.touches[0].clientY;
          }}
          onTouchMove={(event) => {
            if (startY.current === null) return;

            const distance = Math.max(
              0,
              event.touches[0].clientY - startY.current,
            );

            setDragOffset(distance);
          }}
          onTouchEnd={() => {
            if (dragOffset > 90) {
              onClose();
            } else {
              setDragOffset(0);
            }

            startY.current = null;
          }}
          style={dragOffset ? { touchAction: "none" } : undefined}
        >
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>

        <div className="sticky top-0 z-2 flex items-center justify-between border-b bg-card px-4.5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </Button>
        </div>

        <div className="p-4.5">{children}</div>

        {footer && (
          <div className="flex gap-2 border-t px-4.5 py-3.5 [*:flex-1">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-muted-foreground">
        {message}
      </div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3.5 bottom-20 z-200 flex flex-col gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-85">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto animate-in slide-in-from-bottom-2 fade-in rounded-2xl border bg-card px-3.5 py-3 text-xs text-foreground shadow-lg duration-150",
            toast.tone === "success" && "border-l-4 border-l-primary",
            toast.tone === "error" && "border-l-4 border-l-destructive",
          )}
        >
          <i
            className={`fa-solid ${toast.tone === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`}
          />{" "}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export function MonthPicker({ month, onChange, label }) {
  const shift = (delta) => {
    const [year, monthNumber] = month.split("-").map(Number);

    const date = new Date(year, monthNumber - 1 + delta, 1);

    onChange(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => shift(-1)}
        aria-label="Previous month"
      >
        <i className="fa-solid fa-chevron-left" />
      </Button>

      <span className="min-w-23 text-center text-sm font-semibold">
        {label}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => shift(1)}
        aria-label="Next month"
      >
        <i className="fa-solid fa-chevron-right" />
      </Button>
    </div>
  );
}

export function ProgressBar({ value, max, tone, color }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const resolvedTone = color
    ? ""
    : tone || (percent >= 100 ? "danger" : percent >= 80 ? "warning" : "");

  const toneClass =
    resolvedTone === "danger"
      ? "bg-destructive"
      : resolvedTone === "warning"
        ? "bg-amber-500"
        : "bg-foreground";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-250",
          !color && toneClass,
        )}
        style={{
          width: `${percent}%`,
          ...(color ? { background: color } : null),
        }}
      />
    </div>
  );
}

// A fixed palette for category colour-coding, independent of the
// light/dark theme tokens — it needs many distinguishable hues, which
// the semantic token set intentionally doesn't provide. Left unchanged.
export const DONUT_COLORS = [
  "#6366f1",
  "#f97316",
  "#10b981",
  "#e11d48",
  "#0ea5e9",
  "#a855f7",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#64748b",
];

export function donutColor(index) {
  return DONUT_COLORS[index % DONUT_COLORS.length];
}

export function DonutChart({
  data,
  size = 176,
  thickness = 20,
  label,
  value,
  className = "",
}) {
  const slices = data.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const gap = slices.length > 1 ? 2 : 0;

  let offset = 0;

  return (
    <div
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          slices.length === 0
            ? "No data"
            : slices
                .map(
                  (slice) =>
                    `${slice.label}: ${Math.round((slice.value / total) * 100)}%`,
                )
                .join(", ")
        }
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-border"
            strokeWidth={thickness}
          />

          {slices.map((slice, index) => {
            const length = (slice.value / total) * circumference;

            const dash =
              index === slices.length - 1
                ? length
                : Math.min(circumference, length + 0.75);

            const arc = (
              <circle
                key={slice.id ?? index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color ?? donutColor(index)}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );

            offset += length;

            return arc;
          })}
        </g>
      </svg>

      {(label || value) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {value && <div className="text-lg font-semibold">{value}</div>}
          {label && (
            <div className="text-xs text-muted-foreground">{label}</div>
          )}
        </div>
      )}
    </div>
  );
}
