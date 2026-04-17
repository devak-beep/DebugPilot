"use client";

import { useState } from "react";
import type { Collection, RequestData } from "@/lib/api";
import { saveRequest } from "@/lib/api";

interface Props {
  request: RequestData;
  collections: Collection[];
  defaultName?: string;
  defaultCollectionId?: string;
  defaultFolderId?: string;
  onSaved: (name: string, saved?: import("@/lib/api").SavedRequest) => void;
  onClose: () => void;
}

export default function SaveRequestModal({ request, collections, defaultName, defaultCollectionId, defaultFolderId, onSaved, onClose }: Props) {
  const [name, setName] = useState(defaultName ?? `${request.method} ${request.url}`.slice(0, 60));
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? collections[0]?.id ?? "");
  const [folderId, setFolderId] = useState(defaultFolderId ?? "");
  const [saving, setSaving] = useState(false);

  const selectedCollection = collections.find((c) => c.id === collectionId);

  const headersObj: Record<string, string> = {};
  request.headers.forEach(({ key, value }) => { if (key.trim()) headersObj[key] = value; });

  const handleSave = async () => {
    if (!name.trim() || !collectionId) return;
    setSaving(true);
    const saved = await saveRequest({
      name: name.trim(),
      method: request.method,
      url: request.url,
      headers: headersObj,
      body: request.body,
      collectionId,
      folderId: folderId || undefined,
    });
    setSaving(false);
    onSaved(name, saved);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2";
  const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--accent)" }}>💾 Save Request</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="hover:opacity-70">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Request name */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>Request Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={inputCls} style={inputStyle} placeholder="e.g. Get Users" autoFocus />
          </div>

          {/* Collection + folder pickers — only when not pre-targeted */}
          {!defaultCollectionId && (<>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>Collection</label>
              {collections.length === 0
                ? <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No collections yet — create one in the sidebar first.</p>
                : <select value={collectionId} onChange={(e) => { setCollectionId(e.target.value); setFolderId(""); }}
                    className={inputCls} style={inputStyle}>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              }
            </div>

            {selectedCollection && selectedCollection.folders.length > 0 && (
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>Folder (optional)</label>
                <select value={folderId} onChange={(e) => setFolderId(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">— No folder (root) —</option>
                  {selectedCollection.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
          </>)}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !collectionId}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
            style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: saving || !collectionId ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
