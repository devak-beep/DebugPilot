"use client";
import { useState } from "react";

interface ShareData {
  url: string;
  req?: { method: string; url: string; headers: Record<string, string>; body: string | null };
}

function buildCurl(req: NonNullable<ShareData["req"]>): string {
  const parts = [`curl -X ${req.method} '${req.url}'`];
  Object.entries(req.headers).forEach(([k, v]) => parts.push(`  -H '${k}: ${v}'`));
  if (req.body) parts.push(`  -d '${req.body.replace(/'/g, "\\'")}'`);
  return parts.join(" \\\n");
}

export default function ShareLinkModal({ url, req, onClose }: { url: string; req?: ShareData["req"]; onClose: () => void }) {
  const [mode, setMode] = useState<"link" | "curl">("link");
  const [copied, setCopied] = useState(false);

  const curl = req ? buildCurl(req) : null;
  const valueToCopy = mode === "curl" && curl ? curl : url;

  const copy = async () => {
    await navigator.clipboard.writeText(valueToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>

        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>🔗 Share Request</h2>

        {/* Mode toggle */}
        {curl && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["link", "curl"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setCopied(false); }}
                className="flex-1 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: mode === m ? "var(--accent)" : "var(--bg-input)", color: mode === m ? "var(--accent-text)" : "var(--text-muted)" }}>
                {m === "link" ? "🔗 Share Link" : "$ cURL"}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {mode === "link" ? "Anyone with this link can view the request details." : "Copy this cURL command to share or run directly in a terminal."}
        </p>

        {mode === "link" ? (
          <div className="flex gap-2">
            <input readOnly value={url}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              onClick={e => (e.target as HTMLInputElement).select()} />
            <button onClick={copy}
              className="px-4 py-2 rounded-lg text-sm font-bold shrink-0 transition-colors"
              style={{ background: copied ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--accent)", color: copied ? "var(--accent)" : "var(--accent-text)", border: copied ? "1px solid var(--accent)" : "none" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <div className="relative">
            <pre className="px-3 py-2 rounded-lg text-xs font-mono overflow-auto max-h-40"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {curl}
            </pre>
            <button onClick={copy}
              className="absolute top-2 right-2 px-3 py-1 rounded text-xs font-bold"
              style={{ background: copied ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--accent)", color: copied ? "var(--accent)" : "var(--accent-text)", border: copied ? "1px solid var(--accent)" : "none" }}>
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          Close
        </button>
      </div>
    </div>
  );
}
