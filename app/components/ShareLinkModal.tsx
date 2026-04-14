"use client";
import { useState } from "react";

export default function ShareLinkModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>🔗 Share Request</h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Anyone with this link can view the request details.</p>
        <div className="flex gap-2">
          <input readOnly value={url}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            onClick={e => (e.target as HTMLInputElement).select()} />
          <button onClick={copy}
            className="px-4 py-2 rounded-lg text-sm font-bold shrink-0 transition-colors"
            style={{ background: copied ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--accent)", color: copied ? "var(--accent)" : "var(--accent-text)", border: copied ? "1px solid var(--accent)" : "none" }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          Close
        </button>
      </div>
    </div>
  );
}
