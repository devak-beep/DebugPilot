"use client";
import { useEffect, useRef } from "react";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const chars = "01{}[]()<>/\\|=+-*&%$#@!?;:ABCDEFabcdefGETPOSTDELETE";
    const fontSize = 13;
    let cols: number[];
    let drops: number[];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = Array(cols).fill(1);
    }

    resize();
    window.addEventListener("resize", resize);

    const isDark = () => document.documentElement.classList.contains("dark");

    const interval = setInterval(() => {
      ctx.fillStyle = isDark()
        ? "rgba(5, 46, 22, 0.05)"
        : "rgba(240, 253, 244, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const bright = Math.random() > 0.95;
        ctx.fillStyle = isDark()
          ? bright ? "#86efac" : "#16a34a"
          : bright ? "#16a34a" : "#4ade80";
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }, 45);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: 0.35, zIndex: 0 }}
    />
  );
}
