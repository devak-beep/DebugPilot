export default function DebugPilotIconDark({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-icon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="4" y="4" width="72" height="72" rx="16" fill="#22c55e" filter="url(#glow-icon)"/>
      <path d="M45 20 L32 42 L40 42 L35 60 L48 38 L40 38 L45 20Z" fill="#052e16" strokeWidth="0"/>
      <circle cx="40" cy="12" r="2" fill="#22c55e" opacity="0.5" filter="url(#glow-icon)"/>
      <circle cx="68" cy="40" r="2" fill="#22c55e" opacity="0.5" filter="url(#glow-icon)"/>
      <circle cx="12" cy="40" r="2" fill="#22c55e" opacity="0.5" filter="url(#glow-icon)"/>
    </svg>
  );
}
