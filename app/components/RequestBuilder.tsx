"use client";
import { useState, useEffect } from "react";
import type { RequestData } from "@/lib/api";

type Tab = "params" | "headers" | "body" | "auth";
type BodyType = "none" | "json" | "xml" | "text" | "graphql" | "form-data" | "x-www-form-urlencoded";
type AuthType = "none" | "bearer" | "basic" | "api-key" | "oauth2" | "digest";

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e", POST: "#3b82f6", PUT: "#eab308",
  PATCH: "#a855f7", DELETE: "#ef4444", HEAD: "#6b7280", OPTIONS: "#6b7280",
};
const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };

const inputCls = "w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 transition-colors";

function SuggestInput({ value, onChange, placeholder, suggestions }: {
  value: string; onChange: (v: string) => void; placeholder?: string; suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value);
  return (
    <div className="relative" style={{ width: "40%" }}>
      <input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder} className={inputCls} style={{ ...inputStyle, width: "100%" }} />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg overflow-auto max-h-48 shadow-lg text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {filtered.map(s => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="px-3 py-2 cursor-pointer transition-colors hover:opacity-80"
              style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const HEADER_SUGGESTIONS = [
  "Accept", "Accept-Encoding", "Accept-Language", "Authorization",
  "Cache-Control", "Content-Type", "Cookie", "Origin",
  "Referer", "User-Agent", "X-API-Key", "X-Request-ID",
];

const FORM_FIELD_SUGGESTIONS = ["username", "password", "email", "name", "file", "token", "id", "type", "status", "message"];

type KVRow = { key: string; value: string; description?: string; enabled: boolean };

function KVEditor({ rows, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value", keySuggestions, showDescription = false }: {
  rows: KVRow[];
  onChange: (rows: KVRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keySuggestions?: string[];
  showDescription?: boolean;
}) {
  const update = (i: number, field: keyof KVRow, val: string | boolean) => {
    const next = [...rows]; next[i] = { ...next[i], [field]: val }; onChange(next);
  };
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="flex gap-2 px-1">
          <div style={{ width: "24px" }} />
          <span className="text-xs font-medium" style={{ width: "40%", color: "var(--text-muted)" }}>Key</span>
          <span className="text-xs font-medium flex-1" style={{ color: "var(--text-muted)" }}>Value</span>
          {showDescription && <span className="text-xs font-medium" style={{ width: "25%", color: "var(--text-muted)" }}>Description</span>}
          <div style={{ width: "28px" }} />
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input type="checkbox" checked={row.enabled} onChange={(e) => update(i, "enabled", e.target.checked)}
            className="accent-green-600 shrink-0" style={{ width: "16px" }} />
          {keySuggestions ? (
            <SuggestInput value={row.key} onChange={(v) => update(i, "key", v)} placeholder={keyPlaceholder} suggestions={keySuggestions} />
          ) : (
            <input value={row.key} onChange={(e) => update(i, "key", e.target.value)} placeholder={keyPlaceholder}
              className={inputCls} style={{ ...inputStyle, width: "40%", opacity: row.enabled ? 1 : 0.45 }} />
          )}
          <input value={row.value} onChange={(e) => update(i, "value", e.target.value)} placeholder={valuePlaceholder}
            className={`${inputCls} flex-1`} style={{ ...inputStyle, opacity: row.enabled ? 1 : 0.45 }} />
          {showDescription && (
            <input value={row.description ?? ""} onChange={(e) => update(i, "description", e.target.value)}
              placeholder="Description" className={inputCls}
              style={{ ...inputStyle, width: "25%", opacity: row.enabled ? 1 : 0.45 }} />
          )}
          <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            className="px-2 text-sm shrink-0" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      ))}
      {rows.length === 0 && <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>None added.</p>}
      <button type="button" onClick={() => onChange([...rows, { key: "", value: "", description: "", enabled: true }])}
        className="text-xs font-medium" style={{ color: "var(--accent)" }}>+ Add</button>
    </div>
  );
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "text", label: "Text" },
  { value: "graphql", label: "GraphQL" },
  { value: "form-data", label: "Form Data" },
  { value: "x-www-form-urlencoded", label: "URL Encoded" },
];

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: "none", label: "No Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "api-key", label: "API Key" },
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "digest", label: "Digest Auth" },
];

const textareaStyle = {
  background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)",
};

function mkRow(key = "", value = ""): KVRow { return { key, value, description: "", enabled: true }; }

function parseCurl(raw: string): Partial<{ method: string; url: string; headers: KVRow[]; body: string }> | null {
  try {
    // normalize line continuations and collapse whitespace
    const s = raw.replace(/\\\n/g, " ").replace(/\s+/g, " ").trim();
    if (!s.startsWith("curl")) return null;

    const result: { method: string; url: string; headers: KVRow[]; body: string } = {
      method: "GET", url: "", headers: [], body: "",
    };

    // tokenize respecting quotes
    const tokens: string[] = [];
    let cur = "", inQ: string | null = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQ) { if (c === inQ) inQ = null; else cur += c; }
      else if (c === '"' || c === "'") inQ = c;
      else if (c === " ") { if (cur) { tokens.push(cur); cur = ""; } }
      else cur += c;
    }
    if (cur) tokens.push(cur);

    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === "-X" || t === "--request") { result.method = tokens[++i]; }
      else if (t === "-H" || t === "--header") {
        const h = tokens[++i]; const colon = h.indexOf(":");
        if (colon > 0) result.headers.push(mkRow(h.slice(0, colon).trim(), h.slice(colon + 1).trim()));
      }
      else if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
        result.body = tokens[++i];
        if (result.method === "GET") result.method = "POST";
      }
      else if (t === "-u" || t === "--user") {
        const [u, p = ""] = tokens[++i].split(":");
        result.headers.push(mkRow("Authorization", `Basic ${btoa(`${u}:${p}`)}`));
      }
      else if (!t.startsWith("-") && !result.url) result.url = t;
    }

    return result.url ? result : null;
  } catch { return null; }
}

export default function RequestBuilder({ onSubmit, onSave, isLoading = false, prefill = null }: {
  onSubmit: (data: RequestData) => void;
  onSave?: (data: RequestData) => Promise<void> | void;
  isLoading?: boolean;
  prefill?: RequestData | null;
}) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [tab, setTab] = useState<Tab>("params");
  const [params, setParams] = useState<KVRow[]>([mkRow()]);
  const [headers, setHeaders] = useState<KVRow[]>([mkRow()]);
  const [bodyType, setBodyType] = useState<BodyType>("none");
  const [bodyJson, setBodyJson] = useState("");
  const [bodyXml, setBodyXml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [graphqlQuery, setGraphqlQuery] = useState("");
  const [graphqlVars, setGraphqlVars] = useState("");
  const [formDataRows, setFormDataRows] = useState<KVRow[]>([mkRow()]);
  const [urlEncodedRows, setUrlEncodedRows] = useState<KVRow[]>([mkRow()]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>("none");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyIn, setApiKeyIn] = useState<"header" | "query">("header");
  const [oauth2Token, setOauth2Token] = useState("");
  const [digestUser, setDigestUser] = useState("");
  const [digestPass, setDigestPass] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlInput, setCurlInput] = useState("");
  const [curlError, setCurlError] = useState<string | null>(null);

  const handleCurlImport = () => {
    const parsed = parseCurl(curlInput);
    if (!parsed || !parsed.url) { setCurlError("Could not parse cURL. Make sure it starts with 'curl'."); return; }
    setUrl(parsed.url);
    if (parsed.method) setMethod(parsed.method);
    if (parsed.headers?.length) setHeaders([...parsed.headers, mkRow()]);
    if (parsed.body) {
      try { JSON.parse(parsed.body); setBodyType("json"); setBodyJson(parsed.body); }
      catch { setBodyType("text"); setBodyText(parsed.body); }
    }
    setShowCurlImport(false);
    setCurlInput("");
    setCurlError(null);
  };

  useEffect(() => { if (method === "GET" || method === "HEAD") setBodyType("none"); }, [method]);

  useEffect(() => {
    if (!prefill) return;
    try {
      const parsed = new URL(prefill.url);
      setUrl(parsed.origin + parsed.pathname);
      const p: KVRow[] = [];
      parsed.searchParams.forEach((v, k) => p.push(mkRow(k, v)));
      setParams(p.length > 0 ? p : [mkRow()]);
    } catch {
      setUrl(prefill.url);
      setParams([mkRow()]);
    }
    setMethod(prefill.method);
    setHeaders(prefill.headers.length > 0 ? prefill.headers.map(h => mkRow(h.key, h.value)) : [mkRow()]);
    if (prefill.body) {
      try { JSON.parse(prefill.body); setBodyType("json"); setBodyJson(prefill.body); }
      catch { setBodyType("text"); setBodyText(prefill.body); }
    } else { setBodyType("none"); }
  }, [prefill]);

  const buildFinalUrl = () => {
    const clean = params.filter(p => p.key.trim() && p.enabled);
    let extra: { key: string; value: string }[] = [];
    if (authType === "api-key" && apiKeyIn === "query" && apiKeyValue.trim())
      extra = [{ key: apiKeyName, value: apiKeyValue }];
    const all = [...clean, ...extra];
    if (!all.length) return url;
    try {
      const u = new URL(url);
      all.forEach(({ key, value }) => u.searchParams.set(key, value));
      return u.toString();
    } catch {
      return `${url}?${all.map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`;
    }
  };

  const buildHeaders = (): { key: string; value: string }[] => {
    const h = headers.filter(h => h.key.trim() && h.enabled).map(({ key, value }) => ({ key, value }));
    if (authType === "bearer" && bearerToken.trim())
      h.push({ key: "Authorization", value: `Bearer ${bearerToken.trim()}` });
    else if (authType === "basic" && basicUser.trim())
      h.push({ key: "Authorization", value: `Basic ${btoa(`${basicUser}:${basicPass}`)}` });
    else if (authType === "api-key" && apiKeyIn === "header" && apiKeyValue.trim())
      h.push({ key: apiKeyName, value: apiKeyValue });
    else if (authType === "oauth2" && oauth2Token.trim())
      h.push({ key: "Authorization", value: `Bearer ${oauth2Token.trim()}` });
    else if (authType === "digest" && digestUser.trim())
      h.push({ key: "Authorization", value: `Digest username="${digestUser}", password="${digestPass}"` });
    return h;
  };

  const buildBody = (): string | null => {
    if (method === "GET" || method === "HEAD") return null;
    if (bodyType === "json") return bodyJson || null;
    if (bodyType === "xml") return bodyXml || null;
    if (bodyType === "text") return bodyText || null;
    if (bodyType === "graphql") {
      const vars = graphqlVars.trim();
      return JSON.stringify({ query: graphqlQuery, ...(vars ? { variables: JSON.parse(vars) } : {}) });
    }
    if (bodyType === "x-www-form-urlencoded") {
      const pairs = urlEncodedRows.filter(r => r.key.trim() && r.enabled)
        .map(r => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`).join("&");
      return pairs || null;
    }
    return null;
  };

  const buildFormData = () => {
    if (bodyType === "form-data") return formDataRows.filter(r => r.key.trim() && r.enabled).map(({ key, value }) => ({ key, value }));
    return undefined;
  };

  const getContentTypeHeader = (): string | null => {
    if (bodyType === "json") return "application/json";
    if (bodyType === "xml") return "application/xml";
    if (bodyType === "text") return "text/plain";
    if (bodyType === "graphql") return "application/json";
    if (bodyType === "x-www-form-urlencoded") return "application/x-www-form-urlencoded";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    if (!url.trim()) { setUrlError("URL is required"); return; }
    try { new URL(url); } catch { setUrlError("Please enter a valid URL"); return; }
    if (bodyType === "json" && jsonError) return;

    const builtHeaders = buildHeaders();
    const ct = getContentTypeHeader();
    if (ct && !builtHeaders.some(h => h.key.toLowerCase() === "content-type"))
      builtHeaders.push({ key: "Content-Type", value: ct });

    onSubmit({ url: buildFinalUrl(), method, headers: builtHeaders, body: buildBody(), formData: buildFormData() });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "params", label: "Params" },
    { id: "headers", label: "Headers" },
    { id: "body", label: "Body" },
    { id: "auth", label: "Auth" },
  ];

  const hasBody = method !== "GET" && method !== "HEAD";

  return (
    <div className="rounded-xl overflow-visible shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <form onSubmit={handleSubmit}>
        {/* URL Bar */}
        <div className="flex gap-3 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm font-bold focus:outline-none"
            style={{ background: "var(--bg-input)", border: `1px solid ${METHOD_COLORS[method] ?? "#6b7280"}`, color: METHOD_COLORS[method] ?? "#6b7280" }}>
            {["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map(m => <option key={m} style={{ color: METHOD_COLORS[m] ?? "#6b7280" }}>{m}</option>)}
          </select>
          <div className="flex-1">
            <input type="text" value={url} onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
              placeholder="https://api.example.com/v1/users"
              className="w-full px-4 py-2 rounded-lg font-mono text-sm focus:outline-none focus:ring-2"
              style={{ background: urlError ? "#fef2f2" : "var(--bg-input)", border: `1px solid ${urlError ? "#f87171" : "var(--border)"}`, color: "var(--text-primary)" }} />
            {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
          </div>
          <button type="submit" disabled={isLoading}
            className="px-6 py-2 rounded-lg text-sm font-bold transition-colors"
            style={{ background: isLoading ? "var(--accent-disabled)" : "var(--accent)", color: "var(--accent-text)", cursor: isLoading ? "not-allowed" : "pointer" }}>
            {isLoading ? "Sending..." : "Send"}
          </button>
          {onSave && (
            <button type="button" disabled={saveState !== "idle"} onClick={async () => {
              const builtHeaders = buildHeaders();
              const ct = getContentTypeHeader();
              if (ct && !builtHeaders.some(h => h.key.toLowerCase() === "content-type"))
                builtHeaders.push({ key: "Content-Type", value: ct });
              setSaveState("saving");
              await onSave({ url: buildFinalUrl(), method, headers: builtHeaders, body: buildBody(), formData: buildFormData() });
              setSaveState("saved");
              setTimeout(() => setSaveState("idle"), 2000);
            }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1.5"
              style={{
                background: saveState === "saved" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg-input)",
                color: saveState === "saved" ? "var(--accent)" : "var(--accent)",
                border: saveState === "saved" ? "1px solid var(--accent)" : "1px solid var(--border)",
                opacity: saveState === "saving" ? 0.6 : 1,
              }}>
              {saveState === "saved"
                ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 13H3c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h5l4 4v7c0 .55-.45 1-1 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M9 1v3h3M4 7h6M4 9h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              }
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save"}
            </button>
          )}
          <button type="button" onClick={() => { setShowCurlImport(true); setCurlError(null); }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            title="Import from cURL">
            cURL
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{ borderBottomColor: tab === id ? "var(--tab-active)" : "transparent", color: tab === id ? "var(--tab-active-text)" : "var(--text-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {tab === "params" && (
            <KVEditor rows={params} onChange={setParams} keyPlaceholder="Parameter" valuePlaceholder="Value" showDescription />
          )}

          {tab === "headers" && (
            <KVEditor rows={headers} onChange={setHeaders} keyPlaceholder="Header name" valuePlaceholder="Value"
              keySuggestions={HEADER_SUGGESTIONS} showDescription />
          )}

          {tab === "body" && (
            <div className="space-y-3">
              {/* Body type selector */}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {BODY_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <input type="radio" name="bodyType" value={value} checked={bodyType === value}
                      onChange={() => setBodyType(value)} disabled={!hasBody && value !== "none"} className="accent-green-600" />
                    {label}
                  </label>
                ))}
                {!hasBody && <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>Not allowed for {method}</span>}
              </div>

              {bodyType === "json" && (
                <div>
                  <textarea value={bodyJson} rows={8} placeholder={'{\n  "key": "value"\n}'}
                    onChange={(e) => { setBodyJson(e.target.value); try { JSON.parse(e.target.value); setJsonError(null); } catch { setJsonError(e.target.value.trim() ? "Invalid JSON" : null); } }}
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2"
                    style={{ ...textareaStyle, border: `1px solid ${jsonError ? "#f87171" : "var(--border)"}` }} />
                  {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                </div>
              )}

              {bodyType === "xml" && (
                <textarea value={bodyXml} rows={8} placeholder={"<root>\n  <key>value</key>\n</root>"}
                  onChange={(e) => setBodyXml(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2"
                  style={textareaStyle} />
              )}

              {bodyType === "text" && (
                <textarea value={bodyText} rows={8} placeholder="Plain text body..."
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2"
                  style={textareaStyle} />
              )}

              {bodyType === "graphql" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Query</label>
                  <textarea value={graphqlQuery} rows={6} placeholder={"query {\n  users {\n    id\n    name\n  }\n}"}
                    onChange={(e) => setGraphqlQuery(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2"
                    style={textareaStyle} />
                  <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Variables (JSON)</label>
                  <textarea value={graphqlVars} rows={3} placeholder={'{ "id": 1 }'}
                    onChange={(e) => setGraphqlVars(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2"
                    style={textareaStyle} />
                </div>
              )}

              {bodyType === "form-data" && (
                <KVEditor rows={formDataRows} onChange={setFormDataRows} keyPlaceholder="Field name" valuePlaceholder="Value"
                  keySuggestions={FORM_FIELD_SUGGESTIONS} />
              )}

              {bodyType === "x-www-form-urlencoded" && (
                <KVEditor rows={urlEncodedRows} onChange={setUrlEncodedRows} keyPlaceholder="Key" valuePlaceholder="Value" />
              )}
            </div>
          )}

          {tab === "auth" && (
            <div className="space-y-4">
              {/* Auth type selector */}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {AUTH_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <input type="radio" name="authType" value={value} checked={authType === value}
                      onChange={() => setAuthType(value)} className="accent-green-600" />
                    {label}
                  </label>
                ))}
              </div>

              {authType === "bearer" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Token</label>
                  <input type="text" value={bearerToken} onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="Enter bearer token" className={inputCls} style={inputStyle} />
                </div>
              )}

              {authType === "basic" && (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Username</label>
                    <input type="text" value={basicUser} onChange={(e) => setBasicUser(e.target.value)}
                      placeholder="Username" className={inputCls} style={inputStyle} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Password</label>
                    <input type="password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)}
                      placeholder="Password" className={inputCls} style={inputStyle} />
                  </div>
                </div>
              )}

              {authType === "api-key" && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Key Name</label>
                      <input type="text" value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)}
                        placeholder="X-API-Key" className={inputCls} style={inputStyle} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Key Value</label>
                      <input type="text" value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)}
                        placeholder="your-api-key" className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {(["header", "query"] as const).map(loc => (
                      <label key={loc} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                        <input type="radio" name="apiKeyIn" value={loc} checked={apiKeyIn === loc}
                          onChange={() => setApiKeyIn(loc)} className="accent-green-600" />
                        Add to {loc === "header" ? "Header" : "Query Params"}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {authType === "oauth2" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Access Token</label>
                  <input type="text" value={oauth2Token} onChange={(e) => setOauth2Token(e.target.value)}
                    placeholder="Paste your OAuth 2.0 access token" className={inputCls} style={inputStyle} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sent as Authorization: Bearer &lt;token&gt;</p>
                </div>
              )}

              {authType === "digest" && (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Username</label>
                    <input type="text" value={digestUser} onChange={(e) => setDigestUser(e.target.value)}
                      placeholder="Username" className={inputCls} style={inputStyle} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Password</label>
                    <input type="password" value={digestPass} onChange={(e) => setDigestPass(e.target.value)}
                      placeholder="Password" className={inputCls} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {showCurlImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCurlImport(false)}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Import from cURL</h2>
              <button onClick={() => setShowCurlImport(false)} className="text-sm" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ height: "1px", background: "var(--border)" }} />
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Paste a cURL command below.</p>
              <textarea value={curlInput} onChange={e => { setCurlInput(e.target.value); setCurlError(null); }}
                rows={6} placeholder={`curl -X POST https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"John"}'`}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none resize-none"
                style={{ background: "var(--bg-input)", border: `1px solid ${curlError ? "#f87171" : "var(--border)"}`, color: "var(--text-primary)" }} />
              {curlError && <p className="text-xs" style={{ color: "#f87171" }}>{curlError}</p>}
            </div>
            <div style={{ height: "1px", background: "var(--border)" }} />
            <div className="flex gap-3 px-6 py-4">
              <button onClick={() => setShowCurlImport(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Cancel
              </button>
              <button onClick={handleCurlImport} disabled={!curlInput.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: curlInput.trim() ? 1 : 0.5 }}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
