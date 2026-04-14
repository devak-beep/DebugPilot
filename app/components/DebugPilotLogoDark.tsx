export default function DebugPilotLogoDark({ compact = false, nav = false }: { compact?: boolean; nav?: boolean }) {
  const iconSize = nav ? 32 : compact ? 48 : 80;
  const textCls = nav ? "text-xl" : compact ? "text-3xl" : "text-5xl";
  const subCls = nav ? "text-[10px] mt-0" : compact ? "text-xs mt-0.5" : "text-sm mt-1";
  const gap = nav ? "gap-2" : compact ? "gap-3" : "gap-5";

  return (
    <div className={`flex items-center ${gap}`}>
      <div className="relative shrink-0">
        <svg width={iconSize} height={iconSize} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect x="4" y="4" width="72" height="72" rx="16" fill="#22c55e" filter="url(#glow)"/>
          <path d="M45 20 L32 42 L40 42 L35 60 L48 38 L40 38 L45 20Z" fill="#052e16" strokeWidth="0"/>
          <circle cx="40" cy="12" r="2" fill="#22c55e" opacity="0.5" filter="url(#glow)"/>
          <circle cx="68" cy="40" r="2" fill="#22c55e" opacity="0.5" filter="url(#glow)"/>
          <circle cx="12" cy="40" r="2" fill="#22c55e" opacity="0.5" filter="url(#glow)"/>
        </svg>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-0">
          <span className={`${textCls} font-black text-[#dcfce7] tracking-tight`}>Debug</span>
          <span className={`${textCls} font-black text-[#22c55e] tracking-tight`} style={{textShadow: '0 0 20px rgba(34, 197, 94, 0.5)'}}>Pilot</span>
        </div>
        <span className={`${subCls} font-semibold text-[#22c55e] tracking-wider uppercase`}>API Debugger</span>
      </div>
    </div>
  );
}
