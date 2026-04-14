"use client";

import { useState } from "react";

interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timeTaken: number;
  createdAt: string;
  headers: string;
  body: string | null;
}

interface Props {
  history: HistoryEntry[];
  isLoading: boolean;
  replayingId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onReplay: (entry: HistoryEntry) => void;
  onDiff: (a: HistoryEntry, b: HistoryEntry) => void;
}

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET:    { bg: "#dcfce7", text: "#15803d" },
  POST:   { bg: "#dbeafe", text: "#1d4ed8" },
  PUT:    { bg: "#fef9c3", text: "#a16207" },
  PATCH:  { bg: "#f3e8ff", text: "#7e22ce" },
  DELETE: { bg: "#fee2e2", text: "#b91c1c" },
};

function statusColor(s: number) {
  if (s >= 200 && s < 300) return "#16a34a";
  if (s >= 400 && s < 500) return "#ea580c";
  return "#dc2626";
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryPanel({ history, isLoading, replayingId, onSelect, onReplay, onDiff }: Props) {
  const [diffSelection, setDiffSelection] = useState<string[]>([]);

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

  const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" };

  if (isLoading) return (
    <div className="p-6 rounded-xl text-center text-sm animate-pulse" style={cardStyle}>
      <span style={{ color: "var(--text-muted)" }}>Loading history...</span>
    </div>
  );

  if (history.length === 0) return (
    <div className="p-6 rounded-xl text-center text-sm" style={cardStyle}>
      <span style={{ color: "var(--text-muted)" }}>No request history yet. Send a request to get started.</span>
    </div>
  );

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={cardStyle}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          History <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>({history.length})</span>
        </h2>
        {diffSelection.length === 2 && (
          <button onClick={handleDiff}
            className="text-xs px-3 py-1 rounded font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            Compare Selected
          </button>
        )}
        {diffSelection.length === 1 && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Select one more to compare</span>
        )}
      </div>
      <ul className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
        {history.map((entry) => {
          const isSelected = diffSelection.includes(entry.id);
          const mc = METHOD_COLORS[entry.method] ?? { bg: "var(--bg-input)", text: "var(--text-muted)" };
          return (
            <li key={entry.id} onClick={() => onSelect(entry)}
              className="flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors"
              style={{ background: isSelected ? "color-mix(in srgb, var(--accent) 10%, transparent)" : undefined }}>
              <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                style={{ background: mc.bg, color: mc.text }}>{entry.method}</span>
              <span className="flex-1 text-sm font-mono truncate min-w-0" title={entry.url}
                style={{ color: "var(--text-primary)" }}>{entry.url}</span>
              <span className="text-xs font-semibold shrink-0" style={{ color: statusColor(entry.status) }}>{entry.status}</span>
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{entry.timeTaken}ms</span>
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)", opacity: 0.6 }}>{timeAgo(entry.createdAt)}</span>
              <button onClick={(e) => toggleDiff(e, entry.id)}
                className="text-xs px-2 py-0.5 rounded border font-medium shrink-0 transition-colors"
                style={isSelected
                  ? { background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)", borderColor: "var(--accent)" }
                  : { background: "var(--bg-input)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                {isSelected ? "✓ Diff" : "Diff"}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onReplay(entry); }}
                disabled={replayingId === entry.id}
                className="text-xs py-0.5 rounded border font-medium shrink-0 transition-colors text-center"
                style={{ background: "var(--bg-input)", color: "var(--accent)", borderColor: "var(--border)", opacity: replayingId === entry.id ? 0.5 : 1, width: "62px" }}>
                {replayingId === entry.id ? "..." : "↺ Replay"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
