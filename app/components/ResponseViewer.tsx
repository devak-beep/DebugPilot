"use client";

interface ResponseData {
  id?: string;
  status: number;
  statusText: string;
  body: unknown;
  timeTaken: number;
  error?: string;
}

function getStatusColor(status: number) {
  if (status >= 200 && status < 300) return { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" };
  if (status >= 300 && status < 400) return { bg: "#fef9c3", text: "#a16207", border: "#fde68a" };
  if (status >= 400 && status < 500) return { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" };
  return { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" };
}

function getTimingColor(ms: number) {
  if (ms < 300) return "#16a34a";
  if (ms < 1000) return "#ca8a04";
  return "#dc2626";
}

function formatSize(str: string) {
  const bytes = new Blob([str]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SyntaxHighlight({ json }: { json: string }) {
  const highlighted = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "color:#d97706";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "color:#22c55e" : "color:#86efac";
      else if (/true|false/.test(match)) cls = "color:#a78bfa";
      else if (/null/.test(match)) cls = "color:#f87171";
      return `<span style="${cls}">${match}</span>`;
    }
  );
  return <code className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

export default function ResponseViewer({ response, onSaveResponse }: { response: ResponseData; onSaveResponse?: () => void }) {
  const statusColor = getStatusColor(response.status);
  const isError = !!response.error;
  const isJson = !isError && typeof response.body === "object" && response.body !== null;
  const isLarge = !isError && JSON.stringify(response.body).length > 10000;
  const formattedBody = isError ? response.error : isJson ? JSON.stringify(response.body, null, 2) : String(response.body);
  const bodySize = formattedBody ? formatSize(formattedBody) : "0 B";

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-sm font-bold border"
            style={{ background: statusColor.bg, color: statusColor.text, borderColor: statusColor.border }}>
            {response.status} {response.statusText}
          </span>
          {isError && (
            <span className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>Error</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Time: <strong style={{ color: getTimingColor(response.timeTaken) }}>{response.timeTaken}ms</strong></span>
          <span style={{ color: "var(--text-muted)" }}>Size: <strong style={{ color: "var(--text-secondary)" }}>{bodySize}</strong></span>
          {onSaveResponse && (
            <button onClick={onSaveResponse}
              className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
              💾 Save Response
            </button>
          )}
        </div>
      </div>

      {isLarge && (
        <div className="px-6 py-2 text-sm" style={{ background: "#fefce8", borderBottom: "1px solid #fde68a", color: "#a16207" }}>
          ⚠️ Large response ({bodySize}) — scrolling enabled.
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {isError ? "Error" : "Response Body"}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--badge-json-bg)", color: "var(--badge-json-text)", border: "1px solid var(--border)" }}>
            {isError ? "Error" : isJson ? "JSON" : "Plain Text"}
          </span>
        </div>
        <div className={`rounded-lg p-4 overflow-auto font-mono ${isLarge ? "max-h-64" : "max-h-96"}`}
          style={{ background: "#0a0a0a" }}>
          {isJson
            ? <SyntaxHighlight json={formattedBody ?? ""} />
            : <code className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d1d5db" }}>{formattedBody}</code>
          }
        </div>
      </div>
    </div>
  );
}
