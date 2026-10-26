"use client";

import { useState, useRef } from "react";

type AudioPlayerProps = {
  src: string;
  label?: string;
};

export default function AudioPlayer({ src, label }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-[#f4f9f6] px-3 py-1.5 shadow-sm transition hover:border-emerald-300">
      <audio ref={audioRef} src={src} onEnded={handleEnded} preload="none" />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#124d35] text-white shadow-sm transition hover:bg-[#0c3826] active:scale-95"
        title={isPlaying ? "إيقاف مؤقت" : "استماع للنطق الصحيح"}
      >
        {isPlaying ? (
          // أيقونة إيقاف
          <span className="text-xs">⏸</span>
        ) : (
          // أيقونة تشغيل
          <span className="mr-0.5 text-xs">▶</span>
        )}
      </button>

      {label && (
        <span className="text-xs font-bold text-[#144d34]">
          {label}
        </span>
      )}

      {/* موجات صوتية جمالية تظهر عند التشغيل */}
      {isPlaying && (
        <div className="flex items-center gap-0.5 px-1">
          <span className="h-3 w-0.5 animate-pulse bg-emerald-600" />
          <span className="h-4 w-0.5 animate-pulse bg-emerald-600 delay-75" />
          <span className="h-2 w-0.5 animate-pulse bg-emerald-600 delay-150" />
        </div>
      )}
    </div>
  );
}