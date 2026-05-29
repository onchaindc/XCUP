"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEFAULT_AUDIO_SRC = "/audio/magic-in-the-air.mp3";
const AUDIO_SRC = process.env.NEXT_PUBLIC_MATCHDAY_AUDIO_SRC || DEFAULT_AUDIO_SRC;
const AUDIO_STATE_KEY = "xcup-audio-muted";
let sharedAudio: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;

function getAudio() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!sharedAudio) {
    sharedAudio = new Audio(AUDIO_SRC);
    sharedAudio.loop = true;
    sharedAudio.preload = "auto";
    sharedAudio.volume = 0;
  }
  return sharedAudio;
}

function fadeTo(audio: HTMLAudioElement, targetVolume: number, onDone?: () => void) {
  if (fadeTimer) {
    window.clearInterval(fadeTimer);
  }
  fadeTimer = window.setInterval(() => {
    const delta = targetVolume > audio.volume ? 0.04 : -0.04;
    const nextVolume = Math.max(0, Math.min(targetVolume, audio.volume + delta));
    audio.volume = nextVolume;
    if (Math.abs(nextVolume - targetVolume) < 0.041) {
      audio.volume = targetVolume;
      if (fadeTimer) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
      }
      onDone?.();
    }
  }, 40);
}

export function AppAudioButton() {
  const [muted, setMuted] = useState(true);
  const [available, setAvailable] = useState(true);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const stored = window.localStorage.getItem(AUDIO_STATE_KEY);
    setMuted(stored !== "false");
    const audio = getAudio();
    if (!audio) return;

    const onError = () => {
      if (mountedRef.current) {
        setAvailable(false);
        setMuted(true);
      }
    };
    audio.addEventListener("error", onError);
    return () => {
      mountedRef.current = false;
      audio.removeEventListener("error", onError);
    };
  }, []);

  async function toggleAudio() {
    const audio = getAudio();
    if (!audio || !available) {
      return;
    }

    if (muted) {
      try {
        audio.muted = false;
        await audio.play();
        fadeTo(audio, 0.42);
        window.localStorage.setItem(AUDIO_STATE_KEY, "false");
        setMuted(false);
      } catch {
        setAvailable(false);
        setMuted(true);
      }
      return;
    }

    fadeTo(audio, 0, () => {
      audio.pause();
      audio.currentTime = audio.currentTime;
    });
    window.localStorage.setItem(AUDIO_STATE_KEY, "true");
    setMuted(true);
  }

  return (
    <button
      className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
      type="button"
      onClick={() => void toggleAudio()}
      disabled={!available}
      title={available ? (muted ? "Play matchday audio" : "Mute matchday audio") : "Add a licensed matchday audio source"}
      aria-label={muted ? "Play matchday audio" : "Mute matchday audio"}
    >
      {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
    </button>
  );
}
