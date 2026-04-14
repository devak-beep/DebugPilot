"use client";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger = false, onConfirm, onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{danger ? "🗑" : "❓"}</span>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{message}</p>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)" }} />

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
            style={danger
              ? { background: "#ef4444", color: "#fff" }
              : { background: "var(--accent)", color: "var(--accent-text)" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
