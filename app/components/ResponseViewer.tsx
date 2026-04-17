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
  let h = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (lang === "json") {
    h = h.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g,
      (m) => {
        if (/^[{}\[\]]$/.test(m)) return `<span style="color:var(--code-punctuation)">${m}</span>`;
        if (/^[,:]$/.test(m)) return `<span style="color:var(--code-punctuation)">${m}</span>`;
        if (/^"/.test(m)) {
          if (/:$/.test(m)) return `<span style="color:var(--code-key)">${m}</span>`;
          return `<span style="color:var(--code-string)">${m}</span>`;
        }
        if (/true|false/.test(m)) return `<span style="color:var(--code-boolean)">${m}</span>`;
        if (/null/.test(m)) return `<span style="color:var(--code-null)">${m}</span>`;
        return `<span style="color:var(--code-number)">${m}</span>`;
      }
    );
  } else if (lang === "html" || lang === "xml") {
    // comments
    h = h.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) =>
      `<span style="color:var(--code-comment)">${m}</span>`);
    // doctype
    h = h.replace(/(&lt;!DOCTYPE[^&]*&gt;)/gi, (m) =>
      `<span style="color:var(--code-comment)">${m}</span>`);
    // closing tags
    h = h.replace(/(&lt;\/)([\w:-]+)(&gt;)/g, (_, a, tag, c) =>
      `<span style="color:var(--code-punctuation)">${a}</span><span style="color:var(--code-tag)">${tag}</span><span style="color:var(--code-punctuation)">${c}</span>`);
    // opening tags — capture tag name then attributes then close
    h = h.replace(/(&lt;)([\w:-]+)((?:\s+[\w:-]+=(?:&quot;[^"]*&quot;|'[^']*'|[\w-]*))*)(\/?)(&gt;)/g,
      (_, open, tag, attrs, selfClose, close) => {
        const coloredAttrs = attrs.replace(/([\w:-]+)(=)(&quot;[^"]*&quot;|'[^']*'|[\w-]*)/g,
          (_: string, attr: string, eq: string, val: string) =>
            `<span style="color:var(--code-attr)">${attr}</span>${eq}<span style="color:var(--code-string)">${val}</span>`
        );
        return `<span style="color:var(--code-punctuation)">${open}</span><span style="color:var(--code-tag)">${tag}</span>${coloredAttrs}<span style="color:var(--code-punctuation)">${selfClose}${close}</span>`;
      });
  } else if (lang === "js") {
    // comments first
    h = h.replace(/(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)/g, (m) =>
      `<span style="color:var(--code-comment)">${m}</span>`);
    // strings (after escaping, &quot; is used)
    h = h.replace(/(&quot;(?:\\.|[^&])*?&quot;|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)/g, (m) =>
      `<span style="color:var(--code-string)">${m}</span>`);
    // keywords
    h = h.replace(
      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|default|from|typeof|instanceof|void|delete|throw|try|catch|finally|async|await|of|in|yield)\b/g,
      (m) => `<span style="color:var(--code-boolean)">${m}</span>`);
    // booleans/null/undefined
    h = h.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, (m) =>
      `<span style="color:var(--code-null)">${m}</span>`);
    // numbers
    h = h.replace(/\b(0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, (m) =>
      `<span style="color:var(--code-number)">${m}</span>`);
    // function/method calls
    h = h.replace(/\b([\w$]+)(?=\s*\()/g, (m) =>
      `<span style="color:var(--code-key)">${m}</span>`);
  }

  return <code className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: h }} />;
}

function HexView({ raw }: { raw: string }) {
  const bytes = Array.from(new TextEncoder().encode(raw));
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(8, "0");
    const hex = chunk.map(b => b.toString(16).padStart(2, "0")).join(" ").padEnd(47, " ");
    const ascii = chunk.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : ".").join("");
    rows.push(
      `<span style="color:var(--code-null)">${offset}</span>  ` +
      `<span style="color:var(--code-number)">${hex}</span>  ` +
      `<span style="color:var(--code-string)">${ascii.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</span>`
    );
  }
  return <code className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: rows.join("\n") }} />;
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
              className="text-xs px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 11H2c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h4l4 4v5c0 .55-.45 1-1 1z" stroke="currentColor" strokeWidth="1" fill="none"/><path d="M8 1v2h2M3 6h6M3 8h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
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
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
            style={{
              background: copied ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg-input)",
              color: copied ? "var(--accent)" : "var(--text-muted)",
              border: copied ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}>
            {copied
              ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="var(--bg-input)"/></svg>
            }
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
            style={{ background: "var(--code-bg)", color: "var(--code-text)" }}>
            {format === "hex"
              ? <HexView raw={rawStr} />
              : (format === "base64" || format === "text" || viewMode === "raw")
                ? <code className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--code-text)" }}>{displayBody}</code>
                : <SyntaxHighlight code={prettyBody} lang={syntaxLang} />
            }
          </div>
        )}
      </div>
    </div>
  );
}
