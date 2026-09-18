"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Volume2, VolumeX } from "lucide-react";
import { mediaUrl } from "@/lib/types";

type MusicPlayerProps = {
  enabled: boolean;
  musicKey: string | null;
  title: string;
  startAt: number;
  endAt: number | null;
};

const PREFERENCE_KEY = "jejak-farras-music";

export function MusicPlayer({
  enabled,
  musicKey,
  title,
  startAt,
  endAt,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wantsPlayback = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const source = mediaUrl(musicKey);

  const playbackRange = useCallback(() => {
    const audio = audioRef.current;
    const duration = audio?.duration;
    if (!audio || !Number.isFinite(duration) || !duration) {
      return { start: Math.max(0, startAt), end: endAt };
    }
    const start = startAt >= 0 && startAt < duration ? startAt : 0;
    const end = endAt && endAt > start && endAt <= duration ? endAt : duration;
    return { start, end };
  }, [endAt, startAt]);

  const beginPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !wantsPlayback.current) return;
    const range = playbackRange();
    if (
      audio.currentTime < range.start ||
      (range.end !== null && audio.currentTime >= range.end)
    ) {
      audio.currentTime = range.start;
    }
    try {
      await audio.play();
      setPlaying(true);
      setBlocked(false);
    } catch {
      setPlaying(false);
      setBlocked(true);
    }
  }, [playbackRange]);

  useEffect(() => {
    if (!enabled || !source) return;
    wantsPlayback.current = localStorage.getItem(PREFERENCE_KEY) !== "off";
    if (!wantsPlayback.current) return;
    void beginPlayback();

    const resumeOnInteraction = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".music-player")
      ) {
        return;
      }
      void beginPlayback();
    };
    document.addEventListener("pointerdown", resumeOnInteraction, { once: true });
    document.addEventListener("keydown", resumeOnInteraction, { once: true });
    return () => {
      document.removeEventListener("pointerdown", resumeOnInteraction);
      document.removeEventListener("keydown", resumeOnInteraction);
    };
  }, [beginPlayback, enabled, source]);

  if (!enabled || !source) return null;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      wantsPlayback.current = false;
      localStorage.setItem(PREFERENCE_KEY, "off");
      audio.pause();
      setPlaying(false);
      setBlocked(false);
      return;
    }
    wantsPlayback.current = true;
    localStorage.setItem(PREFERENCE_KEY, "on");
    await beginPlayback();
  };

  const keepInsideRange = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const range = playbackRange();
    if (range.end !== null && audio.currentTime >= range.end - 0.05) {
      audio.currentTime = range.start;
      if (wantsPlayback.current) void audio.play();
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = playbackRange().start;
    if (wantsPlayback.current) void beginPlayback();
  };

  return (
    <div className={`music-player${playing ? " is-playing" : ""}`}>
      <audio
        ref={audioRef}
        src={source}
        preload="metadata"
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (audio) audio.currentTime = playbackRange().start;
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={keepInsideRange}
        onEnded={restart}
      />
      <button
        type="button"
        onClick={() => void togglePlayback()}
        aria-label={playing ? "Nonaktifkan musik" : "Aktifkan musik"}
      >
        <span className="music-player-icon" aria-hidden="true">
          {playing ? <Volume2 /> : <VolumeX />}
        </span>
        <span className="music-player-copy">
          <small>{playing ? "Sedang diputar" : blocked ? "Klik untuk memutar" : "Musik nonaktif"}</small>
          <strong><Music2 aria-hidden="true" /> {title}</strong>
        </span>
      </button>
    </div>
  );
}
