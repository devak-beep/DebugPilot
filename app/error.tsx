"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--bg-base)" }}>
      <div className="rounded-xl p-8 max-w-md w-full text-center space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "#dc2626" }}>Something went wrong</h2>
        <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>{error.message}</p>
        <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
          Try again
        </button>
      </div>
    </main>
  );
}
