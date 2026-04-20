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

// ─── JSON Tree ────────────────────────────────────────────────────────────────

function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);

  if (value === null) return <span style={{ color: "var(--code-null)" }}>null</span>;
  if (typeof value === "boolean") return <span style={{ color: "var(--code-boolean)" }}>{String(value)}</span>;
  if (typeof value === "number") return <span style={{ color: "var(--code-number)" }}>{value}</span>;
  if (typeof value === "string") return <span style={{ color: "var(--code-string)" }}>"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--code-punctuation)" }}>[]</span>;
    return (
      <span>
        <button onClick={() => setOpen(o => !o)} className="font-mono text-xs px-1 rounded mr-1"
          style={{ color: "var(--code-punctuation)", background: "color-mix(in srgb, var(--code-punctuation) 10%, transparent)" }}>
          {open ? "▾" : "▸"}
        </button>
        <span style={{ color: "var(--code-punctuation)" }}>[{!open && <span style={{ color: "var(--code-null)" }}> {value.length} items </span>}]</span>
        {open && (
          <div style={{ paddingLeft: "1.25rem", borderLeft: "1px solid var(--border)", marginLeft: "0.25rem" }}>
            {value.map((item, i) => (
              <div key={i} className="flex gap-2 items-start py-0.5">
                <span className="text-xs shrink-0" style={{ color: "var(--code-null)", minWidth: "1.5rem" }}>{i}</span>
                <JsonValue value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span style={{ color: "var(--code-punctuation)" }}>{"{}"}</span>;
    return (
      <span>
        <button onClick={() => setOpen(o => !o)} className="font-mono text-xs px-1 rounded mr-1"
          style={{ color: "var(--code-punctuation)", background: "color-mix(in srgb, var(--code-punctuation) 10%, transparent)" }}>
          {open ? "▾" : "▸"}
        </button>
        <span style={{ color: "var(--code-punctuation)" }}>{"{"}
          {!open && <span style={{ color: "var(--code-null)" }}> {entries.length} keys </span>}
          {!open && "}"}
        </span>
        {open && (
          <div style={{ paddingLeft: "1.25rem", borderLeft: "1px solid var(--border)", marginLeft: "0.25rem" }}>
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-2 items-start py-0.5 flex-wrap">
                <span className="text-xs font-medium shrink-0" style={{ color: "var(--code-key)" }}>{k}</span>
                <span style={{ color: "var(--code-punctuation)" }}>:</span>
                <JsonValue value={v} depth={depth + 1} />
              </div>
            ))}
            <span style={{ color: "var(--code-punctuation)" }}>{"}"}</span>
          </div>
        )}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

function JsonTree({ data }: { data: unknown }) {
  return (
    <div className="text-sm font-mono leading-relaxed" style={{ color: "var(--code-text)" }}>
      <JsonValue value={data} depth={0} />
    </div>
  );
}

// ─── Syntax Highlight (HTML / XML / JS) ──────────────────────────────────────

function SyntaxHighlight({ code, lang }: { code: string; lang: string }) {
  return <CodeWithLineNumbers html={highlightCode(code, lang)} />;
}

function highlightCode(code: string, lang: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (lang === "json") {
    let h = esc(code);
    h = h.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g,
      (m) => {
        if (/^[{}\[\],:]$/.test(m)) return `<span style="color:var(--code-punctuation)">${m}</span>`;
        if (/^"/.test(m)) return /:$/.test(m) ? `<span style="color:var(--code-key)">${m}</span>` : `<span style="color:var(--code-string)">${m}</span>`;
        if (/true|false/.test(m)) return `<span style="color:var(--code-boolean)">${m}</span>`;
        if (/null/.test(m)) return `<span style="color:var(--code-null)">${m}</span>`;
        return `<span style="color:var(--code-number)">${m}</span>`;
      }
    );
    return h;
  }

  if (lang === "html" || lang === "xml") {
    const tokenRe = /<!--[\s\S]*?-->|<!\w[^>]*>|<\/[\w:-]+\s*>|<[\w:-]+(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*\s*\/?>|[^<]+/g;
    let result = "";
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(code)) !== null) {
      const token = match[0];
      if (token.startsWith("<!--") || token.startsWith("<!")) {
        result += `<span style="color:var(--code-comment)">${esc(token)}</span>`;
      } else if (token.startsWith("</")) {
        const tag = token.match(/<\/([\w:-]+)/)?.[1] ?? "";
        result += `<span style="color:var(--code-punctuation)">&lt;/</span><span style="color:var(--code-tag)">${tag}</span><span style="color:var(--code-punctuation)">&gt;</span>`;
      } else if (token.startsWith("<")) {
        const tagMatch = token.match(/^<([\w:-]+)([\s\S]*?)(\/?>)$/);
        if (tagMatch) {
          const [, tagName, attrs, close] = tagMatch;
          const coloredAttrs = attrs.replace(/([\w:-]+)(\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]*))/g,
            (_: string, attr: string, eq: string, val: string) =>
              `<span style="color:var(--code-attr)">${attr}</span>${eq}<span style="color:var(--code-string)">${esc(val)}</span>`
          );
          result += `<span style="color:var(--code-punctuation)">&lt;</span><span style="color:var(--code-tag)">${tagName}</span>${coloredAttrs}<span style="color:var(--code-punctuation)">${esc(close)}</span>`;
        } else {
          result += esc(token);
        }
      } else {
        result += esc(token);
      }
    }
    return result;
  }

  if (lang === "js") {
    const tokenRe = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|default|from|typeof|instanceof|void|delete|throw|try|catch|finally|async|await|of|in|yield)\b)|(\b(?:true|false|null|undefined|NaN|Infinity)\b)|(0x[\da-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([\w$]+(?=\s*\())|([<>&])|(.)/g;
    let result = "";
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(code)) !== null) {
      const [, c1, c2, str, kw, nullish, num, fn, special, other] = m;
      if (c1 || c2) result += `<span style="color:var(--code-comment)">${esc(m[0])}</span>`;
      else if (str) result += `<span style="color:var(--code-string)">${esc(str)}</span>`;
      else if (kw) result += `<span style="color:var(--code-boolean)">${kw}</span>`;
      else if (nullish) result += `<span style="color:var(--code-null)">${nullish}</span>`;
      else if (num) result += `<span style="color:var(--code-number)">${num}</span>`;
      else if (fn) result += `<span style="color:var(--code-key)">${fn}</span>`;
      else if (special) result += esc(special);
      else result += other ?? "";
    }
    return result;
  }

  return esc(code);
}

function SyntaxHighlightWithLines({ code, lang }: { code: string; lang: string }) {
  return <CodeWithLineNumbers html={highlightCode(code, lang)} />;
}

// ─── Hex View ─────────────────────────────────────────────────────────────────

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
      `<span style="color:var(--code-string)">${ascii.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`
    );
  }
  return <code className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: rows.join("\n") }} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, "0")).join(" ");
}

function toBase64(str: string) {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}

function prettyXmlHtml(rawStr: string) {
  try {
    const str = rawStr.replace(/>\s*</g, "><").trim();
    let indent = 0;
    return str.replace(/(<\/?[^>]+>)/g, (tag) => {
      const isClose = tag.startsWith("</");
      const isSelfClose = tag.endsWith("/>") || /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s>]/i.test(tag);
      if (isClose) indent = Math.max(0, indent - 1);
      const line = "  ".repeat(indent) + tag;
      if (!isClose && !isSelfClose) indent++;
      return line;
    }).replace(/></g, ">\n<");
  } catch { return rawStr; }
}

// ─── Code Block with Line Numbers ────────────────────────────────────────────

function CodeWithLineNumbers({ children, html }: { children?: string; html?: string }) {
  const lines = (html ?? children ?? "").split("\n");

  const selectLine = (i: number) => {
    const el = document.getElementById(`code-line-${i}`);
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  return (
    <div className="flex text-sm font-mono leading-relaxed overflow-auto" style={{ minWidth: 0 }}>
      {/* Line numbers */}
      <div className="select-none shrink-0 pr-3 text-right"
        style={{ color: "var(--code-null)", borderRight: "1px solid var(--border)", minWidth: "2.5rem" }}>
        {lines.map((_, i) => (
          <div key={i} onClick={() => selectLine(i)}
            className="cursor-pointer hover:opacity-80 px-1"
            style={{ lineHeight: "1.6rem" }}>
            {i + 1}
          </div>
        ))}
      </div>
      {/* Code */}
      <div className="pl-3 flex-1 overflow-auto whitespace-pre-wrap" style={{ minWidth: 0 }}>
        {lines.map((line, i) =>
          html ? (
            <div key={i} id={`code-line-${i}`} style={{ lineHeight: "1.6rem" }}
              dangerouslySetInnerHTML={{ __html: line || " " }} />
          ) : (
            <div key={i} id={`code-line-${i}`} style={{ lineHeight: "1.6rem" }}>
              {line || " "}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ResponseViewer({ response, onSaveResponse, url, filename }: { response: ResponseData; onSaveResponse?: () => void; url?: string; filename?: string }) {
  const statusColor = getStatusColor(response.status);
  const isError = !!response.error;

  const rawStr = isError
    ? (response.error ?? "")
    : typeof response.body === "string"
      ? response.body
      : JSON.stringify(response.body, null, 2);

  // Parse JSON object for tree view
  const parsedJson = (() => {
    if (isError) return null;
    if (typeof response.body === "object" && response.body !== null) return response.body;
    try { return JSON.parse(rawStr); } catch { return null; }
  })();

  const detectedFormat = isError ? "text" : detectFormat(response.body, rawStr);
  const [format, setFormat] = useState<BodyFormat>(detectedFormat);
  const [viewMode, setViewMode] = useState<ViewMode>("pretty");
  const [copied, setCopied] = useState(false);

  const prettyBody = (() => {
    if (format === "hex") return toHex(rawStr);
    if (format === "base64") return toBase64(rawStr);
    if (format === "json") { try { return JSON.stringify(JSON.parse(rawStr), null, 2); } catch { return rawStr; } }
    if (format === "html" || format === "xml") return prettyXmlHtml(rawStr);
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

  const handleDownload = () => {
    const ext = format === "json" ? "json" : format === "html" ? "html" : format === "xml" ? "xml" : format === "javascript" ? "js" : "txt";
    const mime = format === "json" ? "application/json" : format === "html" ? "text/html" : format === "xml" ? "application/xml" : "text/plain";
    const base = filename ? filename.replace(/\.[^.]+$/, "") : "response";
    const blob = new Blob([displayBody], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const FORMATS: BodyFormat[] = ["json", "html", "xml", "javascript", "text", "hex", "base64"];
  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: "pretty", label: "Pretty" },
    { id: "raw", label: "Raw" },
    { id: "preview", label: "Preview" },
  ];

  const syntaxLang = format === "javascript" ? "js" : format;
  // Show tree only for JSON in pretty mode
  const showTree = format === "json" && viewMode === "pretty" && parsedJson !== null;

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

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 gap-2 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-input)" }}>
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
          <button onClick={handleDownload}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download
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
          <iframe srcDoc={displayBody} sandbox="allow-scripts" className="w-full rounded-lg"
            style={{ height: "400px", border: "1px solid var(--border)", background: "#fff" }}
            title="Response Preview" />
        ) : showTree ? (
          // JSON pretty → collapsible tree
          <div className={`rounded-lg p-4 overflow-auto ${isLarge ? "max-h-64" : "max-h-[500px]"}`}
            style={{ background: "var(--code-bg)", border: "1px solid var(--border)" }}>
            <JsonTree data={parsedJson} />
          </div>
        ) : (
          // All other formats → syntax highlighted code block with line numbers
          <div className={`rounded-lg p-4 overflow-auto ${isLarge ? "max-h-64" : "max-h-[500px]"}`}
            style={{ background: "var(--code-bg)", color: "var(--code-text)", border: "1px solid var(--border)" }}>
            {format === "hex"
              ? <HexView raw={rawStr} />
              : (format === "base64" || format === "text")
                ? <CodeWithLineNumbers>{displayBody}</CodeWithLineNumbers>
                : <SyntaxHighlightWithLines code={displayBody} lang={syntaxLang} />
            }
          </div>
        )}
      </div>
    </div>
  );
}
