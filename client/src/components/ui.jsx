import { useEffect, useRef, useState } from "react";

import { useApp } from "../store";

export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <div className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-header">
          <div>
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>

          {action}
        </div>
      )}

      {children}
    </div>
  );
}

export function StatCard({ label, value, help, tone = "", className = "" }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone}`}>{value}</div>
      {help && <div className="stat-help">{help}</div>}
    </div>
  );
}

export function Field({ label, error, children, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="input-label">{label}</label>}
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function EmptyState({ icon = "fa-inbox", title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`fa-solid ${icon}`} />
      </div>

      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-text">{message}</p>}
      {action}
    </div>
  );
}

/*
  Replaces openModal from the original, which built markup as a string and
  attached listeners by hand after injecting it.
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
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
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
          className="modal-handle"
          onTouchStart={(event) => {
            startY.current = event.touches[0].clientY;
          }}
          onTouchMove={(event) => {
            if (startY.current === null) return;

            // Only downward drags count. Anything upward is ignored so the
            // sheet cannot be pulled above its resting position.
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
          <span />
        </div>

        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
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
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-slate-600">{message}</div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          <i
            className={`fa-solid ${toast.tone === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`}
          />
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
    <div className="month-picker">
      <button
        type="button"
        className="icon-button"
        onClick={() => shift(-1)}
        aria-label="Previous month"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      <span className="month-label">{label}</span>

      <button
        type="button"
        className="icon-button"
        onClick={() => shift(1)}
        aria-label="Next month"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}

export function ProgressBar({ value, max, tone, color }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const resolvedTone = color
    ? ""
    : tone || (percent >= 100 ? "danger" : percent >= 80 ? "warning" : "");

  return (
    <div className="progress-track">
      <div
        className={`progress-fill ${resolvedTone}`}
        style={{
          width: `${percent}%`,
          ...(color ? { background: color } : null),
        }}
      />
    </div>
  );
}

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

/*
  data: [{ id, label, value, color? }]
  Slices are drawn as dashed strokes on a single circle, rotated so the
  first slice starts at 12 o'clock.
*/
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

  // Small visual gap between slices, skipped when there is only one.
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
            stroke="#e2e8f0"
            strokeWidth={thickness}
          />

          {slices.map((slice, index) => {
            const length = (slice.value / total) * circumference;

            // Overlap into the next slice by a hair. The next arc is painted on
            // top of it, so the only visible effect is no seam. The last slice
            // is left alone so it doesn't paint over the first one's edge.
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
          {label && <div className="text-xs text-slate-500">{label}</div>}
        </div>
      )}
    </div>
  );
}
