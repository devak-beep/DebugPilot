"use client";
import { useState } from "react";
import { saveExample } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";

export default function SaveExampleModal({ response, savedRequestId, onSaved, onClose }: {
  response: ApiResponse;
  savedRequestId: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(`Example ${response.status}`);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!savedRequestId || !name.trim()) return;
    setSaving(true);
    try {
      await saveExample(savedRequestId, {
        name: name.trim(),
        status: response.status,
        statusText: response.statusText,
        response: typeof response.body === "string" ? response.body : JSON.stringify(response.body ?? ""),
        timeTaken: response.timeTaken,
      });
      onSaved();
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Save Response</h2>

        {!savedRequestId ? (
          <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            This request hasn't been saved yet. Save it to a collection first using the Save button, then you can save responses to it.
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Example Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className={inputCls} style={inputStyle} autoFocus />
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            {savedRequestId ? "Cancel" : "Close"}
          </button>
          {savedRequestId && (
            <button onClick={handleSave} disabled={saving || saved || !name.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300"
              style={{
                background: saved ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--accent)",
                color: saved ? "var(--accent)" : "var(--accent-text)",
                border: saved ? "1px solid var(--accent)" : "1px solid transparent",
                opacity: saving ? 0.6 : 1,
              }}>
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
