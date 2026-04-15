"use client";
import { useState } from "react";
import type { Collection } from "@/lib/api";

export default function MoveRequestModal({ collections, onMove, onClose }: {
  collections: Collection[];
  onMove: (collectionId: string, folderId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCol = collections.find(c => c.id === collectionId);

  const handleMove = async () => {
    setLoading(true);
    await onMove(collectionId, folderId);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Move Request</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>

        <div style={{ height: "1px", background: "var(--border)" }} />

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Collection</label>
            <select value={collectionId} onChange={e => { setCollectionId(e.target.value); setFolderId(null); }}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Folder (optional)</label>
            <select value={folderId ?? ""} onChange={e => setFolderId(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="">— No folder (root) —</option>
              {selectedCol?.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--border)" }} />

        <div className="flex gap-3 px-6 py-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button onClick={handleMove} disabled={loading || !collectionId}
            className="flex-1 py-2 rounded-lg text-sm font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Moving..." : "Move"}
          </button>
        </div>
      </div>
    </div>
  );
}
