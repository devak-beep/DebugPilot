"use client";

interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timeTaken: number;
}

interface Props {
  a: { entry: HistoryEntry; response: string };
  b: { entry: HistoryEntry; response: string };
  onClose: () => void;
}

function diffLines(a: string, b: string) {
  const aLines = a.split("\n"), bLines = b.split("\n");
  const maxLen = Math.max(aLines.length, bLines.length);
  return Array.from({ length: maxLen }, (_, i) => ({
    aLine: aLines[i] ?? "", bLine: bLines[i] ?? "", changed: (aLines[i] ?? "") !== (bLines[i] ?? ""),
  }));
}

function fmt(raw: string) {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e", POST: "#3b82f6", PUT: "#eab308",
  PATCH: "#a855f7", DELETE: "#ef4444", HEAD: "#6b7280", OPTIONS: "#6b7280",
};

export default function DiffViewer({ a, b, onClose }: Props) {
  const lines = diffLines(fmt(a.response), fmt(b.response));
  const changed = lines.filter((l) => l.changed).length;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: "1px solid var(--border)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ background: "linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--accent) 8%, var(--bg-card)) 100%)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-base">⚡</span>
          <h2 className="text-sm font-bold tracking-wide" style={{ color: "var(--accent)" }}>Response Diff</h2>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={changed > 0
              ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }
              : { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
            {changed > 0 ? `${changed} line${changed !== 1 ? "s" : ""} changed` : "✓ Identical"}
          </span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>✕</button>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-2" style={{ background: "#0d1117", borderBottom: "1px solid #1e2d1e" }}>
        {[a, b].map(({ entry }, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderRight: i === 0 ? "1px solid #1e2d1e" : undefined }}>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.05)", color: METHOD_COLORS[entry.method] ?? "#9ca3af" }}>
              {entry.method}
            </span>
            <span className="text-xs font-bold" style={{ color: entry.status < 300 ? "#4ade80" : "#f87171" }}>
              {entry.status}
            </span>
            <span className="text-xs font-mono truncate" style={{ color: "#6b7280" }} title={entry.url}>
              {entry.url}
            </span>
          </div>
        ))}
      </div>

      {/* Diff body */}
      <div className="grid grid-cols-2 font-mono text-xs overflow-auto max-h-[420px]" style={{ background: "#0d1117" }}>
        {/* Left — old */}
        <div style={{ borderRight: "1px solid #1e2d1e" }}>
          {lines.map((l, i) => (
            <div key={i} className="flex items-start py-0.5 pr-4"
              style={{
                background: l.changed ? "rgba(239,68,68,0.08)" : undefined,
                borderLeft: l.changed ? "3px solid #f87171" : "3px solid transparent",
              }}>
              <span className="w-10 text-right shrink-0 select-none pr-3 pt-px"
                style={{ color: l.changed ? "#f87171" : "#374151", opacity: 0.6 }}>{i + 1}</span>
              <span className="whitespace-pre leading-5" style={{ color: l.changed ? "#fca5a5" : "#9ca3af" }}>
                {l.aLine || " "}
              </span>
            </div>
          ))}
        </div>

        {/* Right — new */}
        <div>
          {lines.map((l, i) => (
            <div key={i} className="flex items-start py-0.5 pr-4"
              style={{
                background: l.changed ? "rgba(34,197,94,0.08)" : undefined,
                borderLeft: l.changed ? "3px solid #4ade80" : "3px solid transparent",
              }}>
              <span className="w-10 text-right shrink-0 select-none pr-3 pt-px"
                style={{ color: l.changed ? "#4ade80" : "#374151", opacity: 0.6 }}>{i + 1}</span>
              <span className="whitespace-pre leading-5" style={{ color: l.changed ? "#86efac" : "#9ca3af" }}>
                {l.bLine || " "}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-6 px-6 py-3" style={{ background: "#0d1117", borderTop: "1px solid #1e2d1e" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.3)", border: "1px solid #f87171" }} />
          <span className="text-xs" style={{ color: "#6b7280" }}>Removed / Changed (A)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.3)", border: "1px solid #4ade80" }} />
          <span className="text-xs" style={{ color: "#6b7280" }}>Added / Changed (B)</span>
        </div>
      </div>
    </div>
  );
}
