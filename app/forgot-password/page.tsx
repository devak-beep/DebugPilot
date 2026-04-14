"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import { Logo } from "../components/BrandLogo";
import OtpTimer from "../components/OtpTimer";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setSecondsLeft(600);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => { if (s <= 1) { clearInterval(timerRef.current!); return 0; } return s - 1; });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const inputCls = "w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { res, data: await res.json() };
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { res, data } = await post("/api/otp/send", { email, purpose: "reset" });
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep("otp");
    startTimer();
  };

  const handleResend = async () => {
    setError(""); setLoading(true);
    const { res } = await post("/api/otp/send", { email, purpose: "reset" });
    setLoading(false);
    if (res.ok) { setOtp(""); startTimer(); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secondsLeft === 0) { setError("OTP expired. Please request a new one."); return; }
    setError(""); setLoading(true);
    const { res, data } = await post("/api/otp/verify", { email, otp, purpose: "reset" });
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep("password");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { res, data } = await post("/api/reset-password", { email, password });
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push("/login");
  };

  const ErrorBox = ({ msg }: { msg: string }) => (
    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>{msg}</p>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="fixed top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl shadow-lg p-8 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex justify-center pb-2"><Logo compact /></div>

          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required className={inputCls} style={inputStyle} />
              </div>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                Enter the 6-digit OTP sent to <strong>{email}</strong>
              </p>
              {/* Timer */}
              <div className="flex justify-center">
                <OtpTimer secondsLeft={secondsLeft} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>OTP</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456" maxLength={6} required className={inputCls} style={inputStyle} />
              </div>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading || secondsLeft === 0} className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: (loading || secondsLeft === 0) ? 0.5 : 1 }}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setStep("email"); setError(""); }}
                  className="text-xs" style={{ color: "var(--text-muted)" }}>← Back</button>
                <button type="button" onClick={handleResend} disabled={loading || secondsLeft > 480}
                  className="text-xs font-medium" style={{ color: secondsLeft > 480 ? "var(--text-muted)" : "var(--accent)" }}>
                  {secondsLeft > 480 ? `Resend in ${fmt(secondsLeft - 480)}` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password" required className={inputCls} style={inputStyle} />
              </div>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Remember it?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--accent)" }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

