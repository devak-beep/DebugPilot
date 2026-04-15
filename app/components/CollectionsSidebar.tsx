"use client";

import { useState, useRef, useEffect } from "react";
import type { Collection, Folder, SavedRequest, HistoryEntry } from "@/lib/api";
import {
  createCollection, createFolder,
  deleteCollection, deleteFolder, deleteSavedRequest,
  renameCollection, renameFolder, renameSavedRequest,
  deleteExample, getShareToken,
  clearHistory, moveRequest, duplicateRequest,
} from "@/lib/api";
import type { SavedExample } from "@/lib/api";
import ConfirmModal from "./ConfirmModal";
import ShareLinkModal from "./ShareLinkModal";
import MoveRequestModal from "./MoveRequestModal";

interface Props {
  collections: Collection[];
  history: HistoryEntry[];
  historyLoading: boolean;
  replayingId: string | null;
  onRefresh: () => void;
  onLoadRequest: (req: SavedRequest) => void;
  onLoadExample: (ex: SavedExample) => void;
  onLoadHistory: (entry: HistoryEntry) => void;
  onReplay: (entry: HistoryEntry) => void;
  onDiff: (a: HistoryEntry, b: HistoryEntry) => void;
  onSaveFromHistory: (entry: HistoryEntry) => void;
  onHistoryCleared: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e", POST: "#3b82f6", PUT: "#eab308",
  PATCH: "#a855f7", DELETE: "#ef4444", HEAD: "#6b7280", OPTIONS: "#6b7280",
};

function statusColor(s: number) {
  if (s >= 200 && s < 300) return "#22c55e";
  if (s >= 400 && s < 500) return "#ea580c";
  return "#ef4444";
}

function ExampleItem({ example, onDelete, onLoad }: { example: SavedExample; onDelete: () => void; onLoad: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded group cursor-pointer hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
      style={{ color: "var(--text-muted)" }} onClick={onLoad}>
      <span className="text-xs font-bold shrink-0" style={{ color: statusColor(example.status) }}>{example.status}</span>
      <span className="flex-1 text-xs truncate">{example.name}</span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-xs px-1 shrink-0" style={{ color: "#f87171" }}>✕</button>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type MenuItem = { label: string; danger?: boolean; onClick: () => void };

function DotsMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded text-sm leading-none transition-opacity cursor-pointer"
        style={{ color: "var(--text-muted)" }}>
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[130px] rounded-lg shadow-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {items.map((item) => (
            <button key={item.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80 cursor-pointer"
              style={{ color: item.danger ? "#f87171" : "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineInput({ defaultValue = "", onConfirm, onCancel, placeholder }: {
  defaultValue?: string; onConfirm: (v: string) => void; onCancel: () => void; placeholder: string;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div className="mt-1 w-full">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) onConfirm(val.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-xs rounded mb-1 block"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
      <div className="flex gap-1">
        <button onClick={() => val.trim() && onConfirm(val.trim())}
          className="flex-1 py-1 text-xs rounded font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}>✓ Save</button>
        <button onClick={onCancel} className="flex-1 py-1 text-xs rounded"
          style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>✕ Cancel</button>
      </div>
    </div>
  );
}

function RequestItem({ req, onLoad, onDelete, onRename, onConfirmDelete, onRefresh, onShare, onLoadExample, onDuplicate, onMove }: {
  req: SavedRequest; onLoad: () => void; onDelete: () => void; onRename: () => void;
  onConfirmDelete: (label: string, action: () => Promise<void>, message?: string) => void; onRefresh: () => void;
  onShare: (url: string) => void; onLoadExample: (ex: SavedExample) => void;
  onDuplicate: () => void; onMove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasExamples = req.examples?.length > 0;

  const handleShare = async () => {
    const token = await getShareToken(req.id);
    onShare(`${window.location.origin}/share/${token}`);
  };
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
        onClick={onLoad}>
        <span className="text-xs font-bold w-12 shrink-0" style={{ color: METHOD_COLORS[req.method] ?? "#9ca3af" }}>{req.method}</span>
        <span className="flex-1 text-xs truncate" style={{ color: "var(--text-primary)" }}>{req.name}</span>
        {hasExamples && (
          <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            className="text-xs shrink-0 px-1" style={{ color: "var(--text-muted)" }}>{open ? "▾" : "▸"}</button>
        )}
        <DotsMenu items={[
          { label: "✏️ Rename", onClick: onRename },
          { label: "📋 Duplicate", onClick: onDuplicate },
          { label: "📁 Move", onClick: onMove },
          { label: "🔗 Share", onClick: handleShare },
          { label: "🗑 Delete", danger: true, onClick: onDelete },
        ]} />
      </div>
      {open && hasExamples && (
        <div className="ml-4 border-l pl-2 space-y-0.5" style={{ borderColor: "var(--border)" }}>
          {req.examples.map(ex => (
            <ExampleItem key={ex.id} example={ex}
              onLoad={() => onLoadExample(ex)}
              onDelete={() => onConfirmDelete(`Delete example "${ex.name}"?`, async () => { await deleteExample(req.id, ex.id); onRefresh(); })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderItem({ folder, collectionId, onLoadRequest, onDelete, onRename, onRefresh, onConfirmDelete, onShare, onLoadExample, onMoveRequest }: {
  folder: Folder; collectionId: string; onLoadRequest: (r: SavedRequest) => void;
  onDelete: () => void; onRename: () => void; onRefresh: () => void;
  onConfirmDelete: (label: string, action: () => Promise<void>, message?: string) => void;
  onShare: (url: string) => void; onLoadExample: (ex: SavedExample) => void;
  onMoveRequest: (r: SavedRequest) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer group" onClick={() => setOpen(!open)}>
        <span className="text-xs">{open ? "📂" : "📁"}</span>
        <span className="flex-1 text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>{folder.name}</span>
        <DotsMenu items={[
          { label: "✏️ Rename", onClick: onRename },
          { label: "🗑 Delete", danger: true, onClick: onDelete },
        ]} />
      </div>
      {open && (
        <div className="ml-3 border-l pl-2" style={{ borderColor: "var(--border)" }}>
          {folder.requests.length === 0
            ? <p className="text-xs px-2 py-1 italic" style={{ color: "var(--text-muted)" }}>No requests</p>
            : folder.requests.map((r) => (
              renamingId === r.id
                ? <InlineInput key={r.id} defaultValue={r.name} placeholder="Request name"
                    onCancel={() => setRenamingId(null)}
                    onConfirm={async (name) => { await renameSavedRequest(r.id, name); setRenamingId(null); onRefresh(); }} />
                : <RequestItem key={r.id} req={r} onLoad={() => onLoadRequest(r)}
                    onRename={() => setRenamingId(r.id)}
                    onRefresh={onRefresh} onConfirmDelete={onConfirmDelete} onShare={onShare}
                    onLoadExample={onLoadExample}
                    onDuplicate={async () => { await duplicateRequest(r); onRefresh(); }}
                    onMove={() => onMoveRequest(r)}
                    onDelete={() => onConfirmDelete(`Delete "${r.name}"?`, async () => { await deleteSavedRequest(r.id); onRefresh(); },
                      r.examples?.length > 0 ? `This action cannot be undone. All ${r.examples.length} saved response${r.examples.length > 1 ? "s" : ""} will also be permanently deleted.` : undefined)} />
            ))}
        </div>
      )}
    </div>
  );
}

function CollectionItem({ col, onLoadRequest, onRefresh, onConfirmDelete, onRename, onShare, onLoadExample, onMoveRequest }: {
  col: Collection; onLoadRequest: (r: SavedRequest) => void; onRefresh: () => void;
  onConfirmDelete: (label: string, action: () => Promise<void>, message?: string) => void;
  onRename: () => void; onShare: (url: string) => void; onLoadExample: (ex: SavedExample) => void;
  onMoveRequest: (r: SavedRequest) => void;
}) {
  const [open, setOpen] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingRequestId, setRenamingRequestId] = useState<string | null>(null);

  return (
    <div className="rounded-lg overflow-visible" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer group"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))" }}
        onClick={() => setOpen(!open)}>
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        <span className="text-xs font-bold flex-1 truncate uppercase tracking-wide" style={{ color: "var(--accent)" }}>{col.name}</span>
        <DotsMenu items={[
          { label: "✏️ Rename", onClick: onRename },
          { label: "📁 Add Folder", onClick: () => setAddingFolder(true) },
          { label: "🗑 Delete", danger: true, onClick: () => onConfirmDelete(`Delete collection "${col.name}"?`, async () => { await deleteCollection(col.id); onRefresh(); }) },
        ]} />
      </div>
      {open && (
        <div className="p-2 space-y-0.5" style={{ background: "var(--bg-card)" }}>
          {addingFolder && (
            <InlineInput placeholder="Folder name" onCancel={() => setAddingFolder(false)}
              onConfirm={async (name) => { await createFolder(col.id, name); setAddingFolder(false); onRefresh(); }} />
          )}
          {col.requests.map((r) => (
            renamingRequestId === r.id
              ? <InlineInput key={r.id} defaultValue={r.name} placeholder="Request name"
                  onCancel={() => setRenamingRequestId(null)}
                  onConfirm={async (name) => { await renameSavedRequest(r.id, name); setRenamingRequestId(null); onRefresh(); }} />
              : <RequestItem key={r.id} req={r} onLoad={() => onLoadRequest(r)}
                  onRename={() => setRenamingRequestId(r.id)}
                  onRefresh={onRefresh} onConfirmDelete={onConfirmDelete} onShare={onShare}
                  onLoadExample={onLoadExample}
                  onDuplicate={async () => { await duplicateRequest(r); onRefresh(); }}
                  onMove={() => onMoveRequest(r)}
                  onDelete={() => onConfirmDelete(`Delete "${r.name}"?`, async () => { await deleteSavedRequest(r.id); onRefresh(); },
                    r.examples?.length > 0 ? `This action cannot be undone. All ${r.examples.length} saved response${r.examples.length > 1 ? "s" : ""} will also be permanently deleted.` : undefined)} />
          ))}
          {col.folders.map((f) => (
            renamingFolderId === f.id
              ? <InlineInput key={f.id} defaultValue={f.name} placeholder="Folder name"
                  onCancel={() => setRenamingFolderId(null)}
                  onConfirm={async (name) => { await renameFolder(col.id, f.id, name); setRenamingFolderId(null); onRefresh(); }} />
              : <FolderItem key={f.id} folder={f} collectionId={col.id} onLoadRequest={onLoadRequest}
                  onRefresh={onRefresh} onConfirmDelete={onConfirmDelete} onShare={onShare}
                  onLoadExample={onLoadExample}
                  onMoveRequest={onMoveRequest}
                  onRename={() => setRenamingFolderId(f.id)}
                  onDelete={() => onConfirmDelete(`Delete folder "${f.name}"?`, async () => { await deleteFolder(col.id, f.id); onRefresh(); })} />
          ))}
          {col.requests.length === 0 && col.folders.length === 0 && !addingFolder && (
            <p className="text-xs px-2 py-1 italic" style={{ color: "var(--text-muted)" }}>Empty collection</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollectionsSidebar({
  collections, history, historyLoading, replayingId,
  onRefresh, onLoadRequest, onLoadExample, onLoadHistory, onReplay, onDiff, onSaveFromHistory, onHistoryCleared,
}: Props) {
  const [tab, setTab] = useState<"collections" | "history">("collections");
  const [addingCollection, setAddingCollection] = useState(false);
  const [renamingCollectionId, setRenamingCollectionId] = useState<string | null>(null);
  const [diffSelection, setDiffSelection] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ label: string; action: () => Promise<void>; message?: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<SavedRequest | null>(null);
  const [openingLink, setOpeningLink] = useState(false);
  const [pastedLink, setPastedLink] = useState("");

  const toggleDiff = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDiffSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length === 2 ? [prev[1], id] : [...prev, id]
    );
  };

  const handleDiff = () => {
    const [a, b] = diffSelection.map((id) => history.find((h) => h.id === id)!);
    onDiff(a, b);
    setDiffSelection([]);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>

      {/* Tab bar */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["collections", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors"
            style={{ borderBottomColor: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "var(--accent)" : "var(--text-muted)" }}>
            {t === "collections" ? "Collections" : "History"}
          </button>
        ))}
      </div>

      {/* Collections tab */}
      {tab === "collections" && (
        <>
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{collections.length} collection{collections.length !== 1 ? "s" : ""}</span>
            <div className="flex gap-1.5">
              <button onClick={() => { setOpeningLink(o => !o); setPastedLink(""); }}
                className="text-xs px-2 py-1 rounded font-medium"
                style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                title="Open shared link">🔗</button>
              <button onClick={() => setAddingCollection(true)}
                className="text-xs px-2 py-1 rounded font-medium"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}>+ New</button>
            </div>
          </div>
          {openingLink && (
            <div className="px-3 py-2 space-y-1.5 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Paste a shared request link:</p>
              <div className="flex gap-1.5">
                <input autoFocus value={pastedLink} onChange={e => setPastedLink(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && pastedLink.trim()) {
                      const match = pastedLink.match(/\/share\/([a-f0-9]+)/);
                      if (match) { window.open(`/share/${match[1]}`, "_blank"); setOpeningLink(false); setPastedLink(""); }
                    }
                    if (e.key === "Escape") { setOpeningLink(false); setPastedLink(""); }
                  }}
                  placeholder="https://…/share/abc123"
                  className="flex-1 px-2 py-1 rounded text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <button
                  onClick={() => {
                    const match = pastedLink.match(/\/share\/([a-f0-9]+)/);
                    if (match) { window.open(`/share/${match[1]}`, "_blank"); setOpeningLink(false); setPastedLink(""); }
                  }}
                  disabled={!pastedLink.trim()}
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: pastedLink.trim() ? 1 : 0.4 }}>
                  Open
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {addingCollection && (
              <InlineInput placeholder="Collection name" onCancel={() => setAddingCollection(false)}
                onConfirm={async (name) => { await createCollection(name); setAddingCollection(false); onRefresh(); }} />
            )}
            {collections.length === 0 && !addingCollection && (
              <p className="text-xs text-center py-8 italic" style={{ color: "var(--text-muted)" }}>
                No collections yet.<br />Click + New to create one.
              </p>
            )}
            {collections.map((col) => (
              renamingCollectionId === col.id
                ? <InlineInput key={col.id} defaultValue={col.name} placeholder="Collection name"
                    onCancel={() => setRenamingCollectionId(null)}
                    onConfirm={async (name) => { await renameCollection(col.id, name); setRenamingCollectionId(null); onRefresh(); }} />
                : <CollectionItem key={col.id} col={col} onLoadRequest={onLoadRequest} onRefresh={onRefresh}
                    onRename={() => setRenamingCollectionId(col.id)}
                    onShare={setShareUrl}
                    onLoadExample={onLoadExample}
                    onMoveRequest={setMoveTarget}
                    onConfirmDelete={(label, action, message) => setConfirmDelete({ label, action, message })} />
            ))}
          </div>
        </>
      )}

      {/* History tab */}
      {tab === "history" && (
        <>
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{history.length} request{history.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              {diffSelection.length === 2 && (
                <button onClick={handleDiff} className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}>Compare</button>
              )}
              {diffSelection.length === 1 && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pick one more</span>
              )}
              {history.length > 0 && (
                <button onClick={() => setConfirmClear(true)}
                  className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                  🗑 Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {historyLoading && <p className="text-xs text-center py-8 animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</p>}
            {!historyLoading && history.length === 0 && <p className="text-xs text-center py-8 italic" style={{ color: "var(--text-muted)" }}>No history yet.</p>}
            {history.map((entry) => {
              const isSelected = diffSelection.includes(entry.id);
              return (
                <div key={entry.id} onClick={() => onLoadHistory(entry)}
                  className="px-3 py-2 cursor-pointer border-b group"
                  style={{ borderColor: "var(--border)", background: isSelected ? "color-mix(in srgb, var(--accent) 10%, transparent)" : undefined }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold shrink-0" style={{ color: METHOD_COLORS[entry.method] ?? "#9ca3af" }}>{entry.method}</span>
                    <span className="text-xs font-semibold shrink-0" style={{ color: statusColor(entry.status) }}>{entry.status}</span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{entry.timeTaken}ms</span>
                    <span className="text-xs ml-auto shrink-0" style={{ color: "var(--text-muted)", opacity: 0.6 }}>{timeAgo(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs font-mono truncate mb-1.5" style={{ color: "var(--text-muted)" }}>{entry.url}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button onClick={(e) => toggleDiff(e, entry.id)} title="Select for diff"
                      className="flex-1 text-xs py-1 rounded font-medium transition-colors text-center"
                      style={isSelected
                        ? { background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)", border: "1px solid var(--accent)" }
                        : { background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      ⇄ {isSelected ? "✓" : "Diff"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onReplay(entry); }} disabled={replayingId === entry.id}
                      className="flex-1 text-xs py-1 rounded font-medium transition-colors text-center"
                      style={{ background: "var(--bg-input)", color: "var(--accent)", border: "1px solid var(--border)", opacity: replayingId === entry.id ? 0.5 : 1 }}>
                      {replayingId === entry.id ? "⏳" : "↺ Replay"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onSaveFromHistory(entry); }}
                      className="flex-1 text-xs py-1 rounded font-medium transition-colors text-center"
                      style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      💾 Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmClear && (
        <ConfirmModal title="Clear History"
          message="This will permanently delete all request history. This action cannot be undone."
          confirmLabel="Yes, Clear All" cancelLabel="Cancel" danger
          onConfirm={async () => { await clearHistory(); setConfirmClear(false); onHistoryCleared(); }}
          onCancel={() => setConfirmClear(false)} />
      )}
      {confirmDelete && (
        <ConfirmModal title={confirmDelete.label}
          message={confirmDelete.message ?? "This action cannot be undone."}
          confirmLabel="Delete" cancelLabel="Cancel" danger
          onConfirm={async () => { await confirmDelete.action(); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)} />
      )}
      {shareUrl && <ShareLinkModal url={shareUrl} onClose={() => setShareUrl(null)} />}
      {moveTarget && (
        <MoveRequestModal collections={collections}
          onClose={() => setMoveTarget(null)}
          onMove={async (collectionId, folderId) => {
            await moveRequest(moveTarget.id, collectionId, folderId);
            setMoveTarget(null);
            onRefresh();
          }} />
      )}
    </div>
  );
}
