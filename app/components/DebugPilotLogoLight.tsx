export default function DebugPilotLogoLight({ compact = false, nav = false }: { compact?: boolean; nav?: boolean }) {
  const iconSize = nav ? 32 : compact ? 48 : 80;
  const textCls = nav ? "text-xl" : compact ? "text-3xl" : "text-5xl";
  const subCls = nav ? "text-[10px] mt-0" : compact ? "text-xs mt-0.5" : "text-sm mt-1";
  const gap = nav ? "gap-2" : compact ? "gap-3" : "gap-5";

  return (
    <div className={`flex items-center ${gap}`}>
      <div className="relative shrink-0">
        <svg width={iconSize} height={iconSize} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="72" height="72" rx="16" fill="#16a34a"/>
          <path d="M45 20 L32 42 L40 42 L35 60 L48 38 L40 38 L45 20Z" fill="#ffffff" strokeWidth="0"/>
        </svg>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-0">
          <span className={`${textCls} font-black text-[#14532d] tracking-tight`}>Debug</span>
          <span className={`${textCls} font-black text-[#16a34a] tracking-tight`}>Pilot</span>
        </div>
        <span className={`${subCls} font-semibold text-[#16a34a] tracking-wider uppercase`}>API Debugger</span>
      </div>
    </div>
  );
}
