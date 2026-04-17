"use client";
import { useState } from "react";

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

function SyntaxHighlight({ code, lang }: { code: string; lang: string }) {
  let highlighted = code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (lang === "json") {
    highlighted = highlighted.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "color:#d97706";
        if (/^"/.test(match)) cls = /:$/.test(match) ? "color:#22c55e" : "color:#86efac";
        else if (/true|false/.test(match)) cls = "color:#a78bfa";
        else if (/null/.test(match)) cls = "color:#f87171";
        return `<span style="${cls}">${match}</span>`;
      }
    );
  } else if (lang === "html" || lang === "xml") {
    highlighted = highlighted
      .replace(/(&lt;\/?[\w\s="/.':;#-\/\?]+&gt;)/g, (m) => `<span style="color:#86efac">${m}</span>`)
      .replace(/(&amp;\w+;)/g, (m) => `<span style="color:#f87171">${m}</span>`);
  }

  return <code className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

type ViewMode = "pretty" | "raw" | "preview";
type BodyFormat = "json" | "html" | "xml" | "javascript" | "text" | "hex" | "base64";

function detectFormat(body: unknown, rawStr: string): BodyFormat {
  if (typeof body === "object" && body !== null) return "json";
  const s = rawStr.trimStart();
  if (s.startsWith("<html") || s.startsWith("<!DOCTYPE")) return "html";
  if (s.startsWith("<")) return "xml";
  if (s.startsWith("function") || s.startsWith("var ") || s.startsWith("const ") || s.startsWith("(")) return "javascript";
  return "text";
}

function toHex(str: string) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function toBase64(str: string) {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}

export default function ResponseViewer({ response, onSaveResponse }: { response: ResponseData; onSaveResponse?: () => void }) {
  const statusColor = getStatusColor(response.status);
  const isError = !!response.error;

  const rawStr = isError
    ? (response.error ?? "")
    : typeof response.body === "string"
      ? response.body
      : JSON.stringify(response.body, null, 2);

  const detectedFormat = isError ? "text" : detectFormat(response.body, rawStr);
  const [format, setFormat] = useState<BodyFormat>(detectedFormat);
  const [viewMode, setViewMode] = useState<ViewMode>("pretty");
  const [copied, setCopied] = useState(false);

  const prettyBody = (() => {
    if (format === "hex") return toHex(rawStr);
    if (format === "base64") return toBase64(rawStr);
    if (format === "json") {
      try { return JSON.stringify(JSON.parse(rawStr), null, 2); } catch { return rawStr; }
    }
    return rawStr;
  })();

  const displayBody = viewMode === "raw" ? rawStr : prettyBody;
  const bodySize = formatSize(rawStr);
  const isLarge = rawStr.length > 10000;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const FORMATS: BodyFormat[] = ["json", "html", "xml", "javascript", "text", "hex", "base64"];
  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: "pretty", label: "Pretty" },
    { id: "raw", label: "Raw" },
    { id: "preview", label: "Preview" },
  ];

  const syntaxLang = format === "javascript" ? "js" : format;

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-sm font-bold border"
            style={{ background: statusColor.bg, color: statusColor.text, borderColor: statusColor.border }}>
            {response.status} {response.statusText}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Time: <strong style={{ color: getTimingColor(response.timeTaken) }}>{response.timeTaken}ms</strong></span>
          <span style={{ color: "var(--text-muted)" }}>Size: <strong style={{ color: "var(--text-secondary)" }}>{bodySize}</strong></span>
          {onSaveResponse && (
            <button onClick={onSaveResponse}
              className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
              Save Response
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: format tabs + view mode + copy */}
      <div className="flex items-center justify-between px-4 py-2 gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-input) 60%, var(--bg-card))" }}>
        {/* Format tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {FORMATS.map(f => (
            <button key={f} onClick={() => setFormat(f)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize"
              style={{
                background: format === f ? "var(--accent)" : "transparent",
                color: format === f ? "var(--accent-text)" : "var(--text-muted)",
              }}>
              {f}
            </button>
          ))}
        </div>

        {/* View mode + copy */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {VIEW_MODES.map(({ id, label }) => (
              <button key={id} onClick={() => setViewMode(id)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: viewMode === id ? "var(--accent)" : "var(--bg-input)",
                  color: viewMode === id ? "var(--accent-text)" : "var(--text-muted)",
                  borderRight: id !== "preview" ? "1px solid var(--border)" : "none",
                }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={handleCopy}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: copied ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg-input)",
              color: copied ? "var(--accent)" : "var(--text-muted)",
              border: copied ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {isLarge && (
        <div className="px-6 py-2 text-xs" style={{ background: "#fefce8", borderBottom: "1px solid #fde68a", color: "#a16207" }}>
          ⚠️ Large response ({bodySize}) — scrolling enabled.
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        {viewMode === "preview" ? (
          <iframe
            srcDoc={displayBody}
            sandbox="allow-scripts"
            className="w-full rounded-lg"
            style={{ height: "400px", border: "1px solid var(--border)", background: "#fff" }}
            title="Response Preview"
          />
        ) : (
          <div className={`rounded-lg p-4 overflow-auto font-mono ${isLarge ? "max-h-64" : "max-h-[500px]"}`}
            style={{ background: "#0a0a0a" }}>
            {(viewMode === "pretty" && format !== "hex" && format !== "base64" && format !== "text")
              ? <SyntaxHighlight code={prettyBody} lang={syntaxLang} />
              : <code className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d1d5db" }}>{displayBody}</code>
            }
          </div>
        )}
      </div>
    </div>
  );
}
