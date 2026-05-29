"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

const WORLD_CUP_START = Date.UTC(2026, 5, 11, 0, 0, 0);

function getRemaining() {
  const remainingMs = Math.max(0, WORLD_CUP_START - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function WorldCupCountdown() {
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const interval = window.setInterval(() => setRemaining(getRemaining()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#e7ff00]/20 bg-[#e7ff00]/10 px-3 py-2 text-xs font-black text-white/82 lg:flex"
      title="Countdown to FIFA World Cup 2026"
      aria-label="Countdown to FIFA World Cup 2026"
    >
      <Clock3 size={15} className="text-[#e7ff00]" aria-hidden="true" />
      <span className="text-[#e7ff00]">WC</span>
      <span>{remaining.days}d</span>
      <span>{String(remaining.hours).padStart(2, "0")}h</span>
      <span>{String(remaining.minutes).padStart(2, "0")}m</span>
      <span className="hidden 2xl:inline">{String(remaining.seconds).padStart(2, "0")}s</span>
    </div>
  );
}
