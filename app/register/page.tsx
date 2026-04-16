"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import { Logo } from "../components/BrandLogo";
import OtpTimer from "../components/OtpTimer";
import MatrixRain from "../components/MatrixRain";
import PasswordInput from "../components/PasswordInput";
import { validatePassword } from "@/lib/password";

type Step = "form" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/login";
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); setLoading(false); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }
    const res = await fetch("/api/otp/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "register" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep("otp");
    startTimer();
  };

  const handleResend = async () => {
    setError(""); setLoading(true);
    const res = await fetch("/api/otp/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "register" }),
    });
    setLoading(false);
    if (res.ok) { setOtp(""); startTimer(); }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secondsLeft === 0) { setError("OTP expired. Please request a new one."); return; }
    setError(""); setLoading(true);
    const verifyRes = await fetch("/api/otp/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, purpose: "register" }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) { setLoading(false); setError(verifyData.error); return; }
    const regRes = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const regData = await regRes.json();
    setLoading(false);
    if (!regRes.ok) { setError(regData.error); return; }
    setSuccess(true);
    setTimeout(() => router.push(nextUrl), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <MatrixRain />
      <div className="fixed top-4 right-4" style={{ zIndex: 10 }}><ThemeToggle /></div>
      <div className="w-full max-w-sm" style={{ zIndex: 10, position: "relative" }}>
        <div className="auth-card-border shadow-lg">
        <div className="auth-card-inner p-8 space-y-5">
          <div className="flex justify-center pb-2"><Logo compact /></div>
          {success ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-4xl">🎉</div>
              <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Account created successfully!</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting to login...</p>
            </div>
          ) : (<>
          {step === "form" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name" required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Password</label>
                <PasswordInput value={password} onChange={setPassword} placeholder="Password" showStrength required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Confirm Password</label>
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" required className={inputCls} style={inputStyle} />
              </div>
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
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
              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</p>}
              <button type="submit" disabled={loading || secondsLeft === 0} className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: (loading || secondsLeft === 0) ? 0.5 : 1 }}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setStep("form"); setError(""); setOtp(""); }}
                  className="text-xs" style={{ color: "var(--text-muted)" }}>← Back</button>
                <button type="button" onClick={handleResend} disabled={loading || secondsLeft > 480}
                  className="text-xs font-medium" style={{ color: secondsLeft > 480 ? "var(--text-muted)" : "var(--accent)" }}>
                  {secondsLeft > 480 ? `Resend in ${fmt(secondsLeft - 480)}` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--accent)" }}>Sign In</Link>
          </p>
          </>)}
        </div>
        </div>
      </div>
    </div>
  );
}
