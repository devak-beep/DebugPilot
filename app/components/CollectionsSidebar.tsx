"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Collection, Folder, SavedRequest, HistoryEntry } from "@/lib/api";
import {
  createCollection, createFolder,
  deleteCollection, deleteFolder, deleteSavedRequest,
  renameCollection, renameFolder, renameSavedRequest,
  deleteExample, renameExample, getShareToken,
  clearHistory, moveRequest, duplicateRequest, reorderItems,
} from "@/lib/api";
import type { SavedExample } from "@/lib/api";
import ConfirmModal from "./ConfirmModal";
import ShareLinkModal from "./ShareLinkModal";
import MoveRequestModal from "./MoveRequestModal";

// Shared drag state across all folder/collection components
const dragState = {
  reqId: null as string | null,
  collectionId: null as string | null,
  folderId: null as string | null,
  type: null as 'request' | 'folder' | 'collection' | null,
};

// Registry of callbacks to clear all drop indicators across all instances
const clearIndicatorCallbacks = new Set<() => void>();
import ShareFolderCollectionModal from "./ShareFolderCollectionModal";

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
  onNewRequest: (collectionId: string, folderId: string | null) => void;
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

function ExampleItem({ example, savedRequestId, onDelete, onLoad, onRefresh }: {
  example: SavedExample; savedRequestId: string; onDelete: () => void; onLoad: () => void; onRefresh: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1 rounded group cursor-pointer hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
        style={{ color: "var(--text-muted)" }} onClick={onLoad}>
        <span className="text-xs font-bold shrink-0" style={{ color: statusColor(example.status) }}>{example.status}</span>
        <span className="flex-1 text-xs truncate">{example.name}</span>
        <DotsMenu items={[
          { label: "✏️ Rename", onClick: () => setRenaming(true) },
          { label: "🗑 Delete", danger: true, onClick: onDelete },
        ]} />
      </div>
      {renaming && (
        <div className="px-2 pb-1">
          <InlineInput defaultValue={example.name} placeholder="Example name"
            onConfirm={async (name) => { await renameExample(savedRequestId, example.id, name); setRenaming(false); onRefresh(); }}
            onCancel={() => setRenaming(false)} />
        </div>
      )}
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
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!val.trim() || submitting) return;
    setSubmitting(true);
    await onConfirm(val.trim());
  };
  return (
    <div className="mt-1 w-full">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-xs rounded mb-1 block"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
      <div className="flex gap-1">
        <button onClick={submit} disabled={submitting}
          className="flex-1 py-1 text-xs rounded font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "..." : "✓ Save"}
        </button>
        <button onClick={onCancel} className="flex-1 py-1 text-xs rounded"
          style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>✕ Cancel</button>
      </div>
    </div>
  );
}

function RequestItem({ req, onLoad, onDelete, onRename, onConfirmDelete, onRefresh, onShare, onLoadExample, onDuplicate, onMove, dragHandleProps }: {
  req: SavedRequest; onLoad: () => void; onDelete: () => void; onRename: () => void;
  onConfirmDelete: (label: string, action: () => Promise<void>, message?: string) => void; onRefresh: () => void;
  onShare: (url: string, reqData: { method: string; url: string; headers: Record<string, string>; body: string | null }) => void;
  onLoadExample: (ex: SavedExample) => void;
  onDuplicate: () => void; onMove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [open, setOpen] = useState(false);
  const hasExamples = req.examples?.length > 0;

  const handleShare = async () => {
    const token = await getShareToken(req.id);
    let headers: Record<string, string> = {};
    try { headers = JSON.parse(req.headers); } catch {}
    onShare(`${window.location.origin}/share/${token}`, { method: req.method, url: req.url, headers, body: req.body });
  };
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
        onClick={onLoad} {...dragHandleProps}>
        <span className="text-xs opacity-0 group-hover:opacity-40 cursor-grab shrink-0 select-none" style={{ color: "var(--text-muted)" }}>⠿</span>
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
            <ExampleItem key={ex.id} example={ex} savedRequestId={req.id}
              onLoad={() => onLoadExample(ex)}
              onRefresh={onRefresh}
              onDelete={() => onConfirmDelete(`Delete example "${ex.name}"?`, async () => { await deleteExample(req.id, ex.id); onRefresh(); })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderItem({ folder, collectionId, onLoadRequest, onDelete, onRename, onRefresh, onConfirmDelete, onShare, onLoadExample, onMoveRequest, onNewRequest, onShareFolder, dragHandleProps, onRequestsReordered }: {
  folder: Folder; collectionId: string; onLoadRequest: (r: SavedRequest) => void;
  onDelete: () => void; onRename: () => void; onRefresh: () => void;
  onConfirmDelete: (label: string, action: () => Promise<void>, message?: string) => void;
  onShare: (url: string, reqData: { method: string; url: string; headers: Record<string, string>; body: string | null }) => void;
  onLoadExample: (ex: SavedExample) => void;
  onMoveRequest: (r: SavedRequest) => void; onNewRequest: () => void;
  onShareFolder: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onRequestsReordered: (folderId: string, ids: string[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [requests, setRequests] = useState(folder.requests);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [folderDropOver, setFolderDropOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => { setRequests(folder.requests); }, [folder.requests]);

  // Register this instance so any dragEnd/drop can clear our indicators
  useEffect(() => {
    const clear = () => { setDragOverId(null); setFolderDropOver(false); };
    clearIndicatorCallbacks.add(clear);
    return () => { clearIndicatorCallbacks.delete(clear); };
  }, []);

  // Drop onto a request inside this folder
  const handleReqDrop = async (targetId: string) => {
    const { reqId, folderId: srcFolderId } = dragState;
    clearIndicatorCallbacks.forEach(fn => fn());
    if (!reqId || reqId === targetId) return;

    const isSameFolder = srcFolderId === folder.id;
    if (isSameFolder) {
      const from = requests.findIndex(r => r.id === reqId);
      const to = requests.findIndex(r => r.id === targetId);
      if (from === -1 || to === -1) return;
      const reordered = [...requests];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      setRequests(reordered);
      reorderItems('request', reordered.map(r => r.id));
    } else {
      moveRequest(reqId, collectionId, folder.id).then(() => onRefresh());
    }
    dragState.reqId = null;
  };

  // Drop onto the folder header itself → move request into this folder
  const handleFolderHeaderDrop = async (e: React.DragEvent) => {
    setFolderDropOver(false);
    if (dragState.type !== 'request') return; // let folder drops bubble to parent
    e.stopPropagation();
    const { reqId, folderId: srcFolderId } = dragState;
    if (!reqId || srcFolderId === folder.id) return;
    moveRequest(reqId, collectionId, folder.id).then(() => onRefresh());
    dragState.reqId = null;
  };

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer group"
        style={{ background: folderDropOver ? "color-mix(in srgb, var(--accent) 12%, transparent)" : undefined, transition: "background 0.1s" }}
        onClick={() => setOpen(!open)}
        onDragOver={(e) => {
          if (dragState.type === 'request') { e.preventDefault(); setFolderDropOver(true); }
          else if (dragState.type === 'folder') { e.preventDefault(); }
        }}
        onDragLeave={() => setFolderDropOver(false)}
        onDrop={handleFolderHeaderDrop}
        {...dragHandleProps}>
        <span className="text-xs opacity-0 group-hover:opacity-40 cursor-grab shrink-0 select-none" style={{ color: "var(--text-muted)" }}>⠿</span>
        <span className="text-xs">{open ? "📂" : "📁"}</span>
        <span className="flex-1 text-xs font-medium truncate" style={{ color: folderDropOver ? "var(--accent)" : "var(--text-secondary)" }}>{folder.name}</span>
        <DotsMenu items={[
          { label: "➕ New Request", onClick: onNewRequest },
          { label: "✏️ Rename", onClick: onRename },
          { label: "🔗 Share Folder", onClick: onShareFolder },
          { label: "🗑 Delete", danger: true, onClick: onDelete },
        ]} />
      </div>
      {open && (
        <div className="ml-3 border-l pl-2" style={{ borderColor: "var(--border)" }}>
          {requests.length === 0
            ? <div
                onDragOver={(e) => { if (dragState.reqId) { e.preventDefault(); setFolderDropOver(true); } }}
                onDragLeave={() => setFolderDropOver(false)}
                onDrop={(e) => { e.stopPropagation(); handleFolderHeaderDrop(e); }}
                className="text-xs px-2 py-3 italic rounded"
                style={{ 
                  color: "var(--text-muted)", 
                  background: folderDropOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : undefined,
                  border: folderDropOver ? "1px dashed var(--accent)" : "1px dashed transparent",
                  transition: "all 0.1s"
                }}>
                {folderDropOver ? "Drop here" : "No requests"}
              </div>
            : requests.map((r) => (
              renamingId === r.id
                ? <InlineInput key={r.id} defaultValue={r.name} placeholder="Request name"
                    onCancel={() => setRenamingId(null)}
                    onConfirm={async (name) => { await renameSavedRequest(r.id, name); setRenamingId(null); onRefresh(); }} />
                : <div key={r.id}
                    draggable
                    onDragStart={() => { setDraggingId(r.id); dragState.reqId = r.id; dragState.folderId = folder.id; dragState.collectionId = collectionId; dragState.type = 'request'; }}
                    onDragEnd={() => { setDraggingId(null); dragState.reqId = null; dragState.type = null; clearIndicatorCallbacks.forEach(fn => fn()); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(r.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => { if (dragState.type === 'request') { e.stopPropagation(); handleReqDrop(r.id); } }}
                    style={{
                      opacity: draggingId === r.id ? 0.4 : 1,
                      borderTop: dragOverId === r.id ? "2px solid var(--accent)" : "2px solid transparent",
                      transition: "border-color 0.1s",
                    }}>
                    <RequestItem req={r} onLoad={() => onLoadRequest(r)}
                      onRename={() => setRenamingId(r.id)}
                      onRefresh={onRefresh} onConfirmDelete={onConfirmDelete} onShare={onShare}
                      onLoadExample={onLoadExample}
                      onDuplicate={async () => { await duplicateRequest(r); onRefresh(); }}
                      onMove={() => onMoveRequest(r)}
                      onDelete={() => onConfirmDelete(`Delete "${r.name}"?`, async () => { await deleteSavedRequest(r.id); onRefresh(); },
                        r.examples?.length > 0 ? `This action cannot be undone. All ${r.examples.length} saved response${r.examples.length > 1 ? "s" : ""} will also be permanently deleted.` : undefined)} />
                  </div>
            ))}
        </div>
      )}
    </div>
  );
}

function CollectionItem({ col, onLoadRequest, onRefresh, onConfirmDelete, onRename, onShare, onLoadExample, onMoveRequest, onNewRequest, onShareCollection, onShareFolder, dragHandleProps }: {
  col: Collection; onLoadRequest: (r: SavedRequest) => void; onRefresh: () => void;
  onConfirmDelete: (label: string, action: () => Promise<void>, message?: string) => void;
  onRename: () => void; onShare: (url: string, reqData: { method: string; url: string; headers: Record<string, string>; body: string | null }) => void;
  onLoadExample: (ex: SavedExample) => void;
  onMoveRequest: (r: SavedRequest) => void; onNewRequest: (collectionId: string, folderId: string | null) => void;
  onShareCollection: () => void;
  onShareFolder: (folder: Folder) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [open, setOpen] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingRequestId, setRenamingRequestId] = useState<string | null>(null);

  // Local state for optimistic reordering
  const [folders, setFolders] = useState(col.folders);
  const [rootRequests, setRootRequests] = useState(col.requests);
  useEffect(() => { setFolders(col.folders); }, [col.folders]);
  useEffect(() => { setRootRequests(col.requests); }, [col.requests]);

  const folderDragItem = useRef<string | null>(null);
  const [folderDragOver, setFolderDragOver] = useState<string | null>(null);
  const [folderDraggingId, setFolderDraggingId] = useState<string | null>(null);
  const reqDragItem = useRef<string | null>(null);
  const [reqDragOver, setReqDragOver] = useState<string | null>(null);
  const [reqDraggingId, setReqDraggingId] = useState<string | null>(null);

  // Register clear callback so any drag end clears our indicators too
  useEffect(() => {
    const clear = () => { setFolderDragOver(null); setReqDragOver(null); };
    clearIndicatorCallbacks.add(clear);
    return () => { clearIndicatorCallbacks.delete(clear); };
  }, []);

  const handleFolderDrop = async (targetId: string) => {
    clearIndicatorCallbacks.forEach(fn => fn());
    if (!folderDragItem.current || folderDragItem.current === targetId) return;
    const from = folders.findIndex(f => f.id === folderDragItem.current);
    const to = folders.findIndex(f => f.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...folders];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setFolders(reordered);
    setFolderDraggingId(null);
    folderDragItem.current = null;
    reorderItems('folder', reordered.map(f => f.id));
  };

  const handleRootReqDrop = async (targetId: string) => {
    clearIndicatorCallbacks.forEach(fn => fn());
    if (!reqDragItem.current || reqDragItem.current === targetId) return;
    const from = rootRequests.findIndex(r => r.id === reqDragItem.current);
    const to = rootRequests.findIndex(r => r.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...rootRequests];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setRootRequests(reordered);
    setReqDraggingId(null);
    reqDragItem.current = null;
    reorderItems('request', reordered.map(r => r.id));
  };

  return (
    <div className="rounded-lg overflow-visible" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer group"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))" }}
        onClick={() => setOpen(!open)} {...dragHandleProps}>
        <span className="text-xs opacity-0 group-hover:opacity-40 cursor-grab shrink-0 select-none" style={{ color: "var(--text-muted)" }}>⠿</span>
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        <span className="text-xs font-bold flex-1 truncate uppercase tracking-wide" style={{ color: "var(--accent)" }}>{col.name}</span>
        <DotsMenu items={[
          { label: "✏️ Rename", onClick: onRename },
          { label: "📁 Add Folder", onClick: () => setAddingFolder(true) },
          { label: "🔗 Share Collection", onClick: onShareCollection },
          { label: "🗑 Delete", danger: true, onClick: () => onConfirmDelete(`Delete collection "${col.name}"?`, async () => { await deleteCollection(col.id); onRefresh(); }) },
        ]} />
      </div>
      {open && (
        <div className="p-2 space-y-0.5" style={{ background: "var(--bg-card)" }}>
          {addingFolder && (
            <InlineInput placeholder="Folder name" onCancel={() => setAddingFolder(false)}
              onConfirm={async (name) => { await createFolder(col.id, name); setAddingFolder(false); onRefresh(); }} />
          )}
          {/* Root-level requests */}
          {rootRequests.map((r) => (
            renamingRequestId === r.id
              ? <InlineInput key={r.id} defaultValue={r.name} placeholder="Request name"
                  onCancel={() => setRenamingRequestId(null)}
                  onConfirm={async (name) => { await renameSavedRequest(r.id, name); setRenamingRequestId(null); onRefresh(); }} />
              : <div key={r.id}
                  draggable
                  onDragStart={() => { reqDragItem.current = r.id; setReqDraggingId(r.id); dragState.reqId = r.id; dragState.folderId = null; dragState.collectionId = col.id; dragState.type = 'request'; }}
                  onDragEnd={() => { setReqDraggingId(null); dragState.reqId = null; dragState.type = null; clearIndicatorCallbacks.forEach(fn => fn()); }}
                  onDragOver={(e) => { e.preventDefault(); setReqDragOver(r.id); }}
                  onDragLeave={() => setReqDragOver(null)}
                  onDrop={() => handleRootReqDrop(r.id)}
                  style={{
                    opacity: reqDraggingId === r.id ? 0.4 : 1,
                    borderTop: reqDragOver === r.id ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "border-color 0.1s",
                  }}>
                  <RequestItem req={r} onLoad={() => onLoadRequest(r)}
                    onRename={() => setRenamingRequestId(r.id)}
                    onRefresh={onRefresh} onConfirmDelete={onConfirmDelete} onShare={onShare}
                    onLoadExample={onLoadExample}
                    onDuplicate={async () => { await duplicateRequest(r); onRefresh(); }}
                    onMove={() => onMoveRequest(r)}
                    onDelete={() => onConfirmDelete(`Delete "${r.name}"?`, async () => { await deleteSavedRequest(r.id); onRefresh(); },
                      r.examples?.length > 0 ? `This action cannot be undone. All ${r.examples.length} saved response${r.examples.length > 1 ? "s" : ""} will also be permanently deleted.` : undefined)} />
                </div>
          ))}
          {/* Folders */}
          {folders.map((f) => (
            renamingFolderId === f.id
              ? <InlineInput key={f.id} defaultValue={f.name} placeholder="Folder name"
                  onCancel={() => setRenamingFolderId(null)}
                  onConfirm={async (name) => { await renameFolder(col.id, f.id, name); setRenamingFolderId(null); onRefresh(); }} />
              : <div key={f.id}
                  draggable
                  onDragStart={() => { folderDragItem.current = f.id; setFolderDraggingId(f.id); dragState.type = 'folder'; }}
                  onDragEnd={() => { setFolderDraggingId(null); folderDragItem.current = null; dragState.type = null; clearIndicatorCallbacks.forEach(fn => fn()); }}
                  onDragOver={(e) => { e.preventDefault(); setFolderDragOver(f.id); }}
                  onDragLeave={() => setFolderDragOver(null)}
                  onDrop={() => handleFolderDrop(f.id)}
                  style={{
                    opacity: folderDraggingId === f.id ? 0.4 : 1,
                    borderTop: folderDragOver === f.id ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "border-color 0.1s",
                  }}>
                  <FolderItem folder={f} collectionId={col.id} onLoadRequest={onLoadRequest}
                    onRefresh={onRefresh} onConfirmDelete={onConfirmDelete} onShare={onShare}
                    onLoadExample={onLoadExample}
                    onMoveRequest={onMoveRequest}
                    onNewRequest={() => onNewRequest(col.id, f.id)}
                    onShareFolder={() => onShareFolder(f)}
                    onRename={() => setRenamingFolderId(f.id)}
                    onRequestsReordered={() => {}}
                    onDelete={() => onConfirmDelete(`Delete folder "${f.name}"?`, async () => { await deleteFolder(col.id, f.id); onRefresh(); })} />
                </div>
          ))}
          {rootRequests.length === 0 && folders.length === 0 && !addingFolder && (
            <p className="text-xs px-2 py-1 italic" style={{ color: "var(--text-muted)" }}>Empty collection</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollectionsSidebar({
  collections, history, historyLoading, replayingId,
  onRefresh, onLoadRequest, onLoadExample, onLoadHistory, onReplay, onDiff, onSaveFromHistory, onHistoryCleared, onNewRequest,
}: Props) {
  const [tab, setTab] = useState<"collections" | "history">("collections");
  const [addingCollection, setAddingCollection] = useState(false);
  const [renamingCollectionId, setRenamingCollectionId] = useState<string | null>(null);
  const [diffSelection, setDiffSelection] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ label: string; action: () => Promise<void>; message?: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareReq, setShareReq] = useState<{ method: string; url: string; headers: Record<string, string>; body: string | null } | undefined>();
  const [moveTarget, setMoveTarget] = useState<SavedRequest | null>(null);
  const [openingLink, setOpeningLink] = useState(false);
  const [pastedLink, setPastedLink] = useState("");
  const [shareFolderCol, setShareFolderCol] = useState<{ type: 'folder' | 'collection'; id: string; name: string } | null>(null);

  // Collection-level drag state
  const [localCollections, setLocalCollections] = useState(collections);
  const colDragItem = useRef<string | null>(null);
  const [colDragOver, setColDragOver] = useState<string | null>(null);
  const [colDraggingId, setColDraggingId] = useState<string | null>(null);
  useEffect(() => { setLocalCollections(collections); }, [collections]);

  // Register collection-level clear
  useEffect(() => {
    const clear = () => setColDragOver(null);
    clearIndicatorCallbacks.add(clear);
    return () => { clearIndicatorCallbacks.delete(clear); };
  }, []);

  const handleColDrop = async (targetId: string) => {
    clearIndicatorCallbacks.forEach(fn => fn());
    if (!colDragItem.current || colDragItem.current === targetId) return;
    const from = localCollections.findIndex(c => c.id === colDragItem.current);
    const to = localCollections.findIndex(c => c.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...localCollections];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalCollections(reordered);
    setColDragOver(null);
    setColDraggingId(null);
    colDragItem.current = null;
    reorderItems('collection', reordered.map(c => c.id));
  };

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
                      const match = pastedLink.match(/\/share-v2\/([a-f0-9]+)/) || pastedLink.match(/\/share\/([a-f0-9]+)/);
                      const path = pastedLink.match(/\/share-v2\//) ? `/share-v2/${match?.[1]}` : `/share/${match?.[1]}`;
                      if (match) { window.open(path, "_blank"); setOpeningLink(false); setPastedLink(""); }
                    }
                    if (e.key === "Escape") { setOpeningLink(false); setPastedLink(""); }
                  }}
                  placeholder="https://…/share-v2/abc123"
                  className="flex-1 px-2 py-1 rounded text-xs font-mono focus:outline-none"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <button
                  onClick={() => {
                    const match = pastedLink.match(/\/share-v2\/([a-f0-9]+)/) || pastedLink.match(/\/share\/([a-f0-9]+)/);
                    const path = pastedLink.match(/\/share-v2\//) ? `/share-v2/${match?.[1]}` : `/share/${match?.[1]}`;
                    if (match) { window.open(path, "_blank"); setOpeningLink(false); setPastedLink(""); }
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
            {localCollections.map((col) => (
              renamingCollectionId === col.id
                ? <InlineInput key={col.id} defaultValue={col.name} placeholder="Collection name"
                    onCancel={() => setRenamingCollectionId(null)}
                    onConfirm={async (name) => { await renameCollection(col.id, name); setRenamingCollectionId(null); onRefresh(); }} />
                : <div key={col.id}
                    draggable
                    onDragStart={() => { colDragItem.current = col.id; setColDraggingId(col.id); }}
                    onDragEnd={() => { setColDraggingId(null); colDragItem.current = null; clearIndicatorCallbacks.forEach(fn => fn()); }}
                    onDragOver={(e) => { e.preventDefault(); setColDragOver(col.id); }}
                    onDragLeave={() => setColDragOver(null)}
                    onDrop={() => handleColDrop(col.id)}
                    style={{
                      opacity: colDraggingId === col.id ? 0.4 : 1,
                      borderTop: colDragOver === col.id ? "2px solid var(--accent)" : "2px solid transparent",
                      transition: "border-color 0.1s",
                    }}>
                    <CollectionItem col={col} onLoadRequest={onLoadRequest} onRefresh={onRefresh}
                      onRename={() => setRenamingCollectionId(col.id)}
                      onShare={(url, reqData) => { setShareUrl(url); setShareReq(reqData); }}
                      onLoadExample={onLoadExample}
                      onMoveRequest={setMoveTarget}
                      onNewRequest={onNewRequest}
                      onShareCollection={() => setShareFolderCol({ type: 'collection', id: col.id, name: col.name })}
                      onShareFolder={(f) => setShareFolderCol({ type: 'folder', id: f.id, name: f.name })}
                      onConfirmDelete={(label, action, message) => setConfirmDelete({ label, action, message })} />
                  </div>
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
      {shareUrl && <ShareLinkModal url={shareUrl} req={shareReq} onClose={() => { setShareUrl(null); setShareReq(undefined); }} />}
      {moveTarget && (
        <MoveRequestModal collections={collections}
          onClose={() => setMoveTarget(null)}
          onMove={async (collectionId, folderId) => {
            await moveRequest(moveTarget.id, collectionId, folderId);
            setMoveTarget(null);
            onRefresh();
          }} />
      )}
      {shareFolderCol && (
        <ShareFolderCollectionModal
          type={shareFolderCol.type}
          targetId={shareFolderCol.id}
          targetName={shareFolderCol.name}
          onClose={() => setShareFolderCol(null)} />
      )}
    </div>
  );
}
