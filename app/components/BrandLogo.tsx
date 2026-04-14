"use client";
import { useEffect, useState } from "react";
import DebugPilotLogoLight from "./DebugPilotLogoLight";
import DebugPilotLogoDark from "./DebugPilotLogoDark";
import DebugPilotIconLight from "./DebugPilotIconLight";
import DebugPilotIconDark from "./DebugPilotIconDark";

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function Logo({ compact = false, nav = false }: { compact?: boolean; nav?: boolean }) {
  const dark = useDark();
  return dark ? <DebugPilotLogoDark compact={compact} nav={nav} /> : <DebugPilotLogoLight compact={compact} nav={nav} />;
}

export function Icon({ size = 80 }: { size?: number }) {
  const dark = useDark();
  return dark ? <DebugPilotIconDark size={size} /> : <DebugPilotIconLight size={size} />;
}
