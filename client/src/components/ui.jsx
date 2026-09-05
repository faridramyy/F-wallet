import { useEffect } from "react";

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

export function StatCard({ label, value, help, tone = "" }) {
  return (
    <div className="stat-card">
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
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>

          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Delete", onConfirm, onClose }) {
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
          <i className={`fa-solid ${toast.tone === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`} />
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

    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="month-picker">
      <button type="button" className="icon-button" onClick={() => shift(-1)} aria-label="Previous month">
        <i className="fa-solid fa-chevron-left" />
      </button>

      <span className="month-label">{label}</span>

      <button type="button" className="icon-button" onClick={() => shift(1)} aria-label="Next month">
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}

export function ProgressBar({ value, max, tone }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const resolvedTone = tone || (percent >= 100 ? "danger" : percent >= 80 ? "warning" : "");

  return (
    <div className="progress-track">
      <div className={`progress-fill ${resolvedTone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
