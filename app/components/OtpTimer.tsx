"use client";

export default function OtpTimer({ secondsLeft, total = 600 }: { secondsLeft: number; total?: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const progress = secondsLeft / total;
  const dash = circ * progress;
  const color = secondsLeft > 120 ? "#22c55e" : secondsLeft > 60 ? "#f59e0b" : "#ef4444";
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 72, height: 72 }}>
        <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
          {/* Progress */}
          <circle cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono font-bold" style={{ color }}>{fmt(secondsLeft)}</span>
        </div>
      </div>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {secondsLeft > 0 ? "OTP expires in" : "OTP expired"}
      </span>
    </div>
  );
}
