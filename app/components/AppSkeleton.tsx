export default function AppSkeleton() {
  const pulse = "animate-pulse rounded" as const;
  const bg = { background: "var(--border)" } as const;

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        <div className={`${pulse} h-7 w-28`} style={bg} />
        <div className="flex gap-2 flex-1 overflow-hidden">
          {[1,2,3].map(i => (
            <div key={i} className={`${pulse} h-7 w-28`} style={bg} />
          ))}
        </div>
        <div className={`${pulse} h-7 w-7 ml-auto`} style={bg} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r p-3 space-y-2 hidden md:block" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className={`${pulse} h-7 w-full`} style={bg} />
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`${pulse} h-5`} style={{ ...bg, width: `${60 + i * 7}%` }} />
          ))}
        </div>

        {/* Main */}
        <div className="flex flex-col flex-1 overflow-hidden p-4 gap-4">
          {/* URL bar */}
          <div className="flex gap-2">
            <div className={`${pulse} h-9 w-24`} style={bg} />
            <div className={`${pulse} h-9 flex-1`} style={bg} />
            <div className={`${pulse} h-9 w-20`} style={bg} />
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className={`${pulse} h-7 w-20`} style={bg} />)}
          </div>
          {/* Body */}
          <div className={`${pulse} flex-1`} style={bg} />
        </div>

        {/* Response panel */}
        <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3 border-l hidden lg:flex" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className={`${pulse} h-6 w-16`} style={bg} />)}
          </div>
          <div className={`${pulse} flex-1`} style={bg} />
        </div>
      </div>
    </div>
  );
}
