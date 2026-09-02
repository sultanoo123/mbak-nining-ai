"use client";

import React, { useState, useRef } from "react";
import { Send, Volume2, VolumeX, Sparkles, Heart, Loader2, RefreshCw } from "lucide-react";

export default function Home() {
  const [inputMessage, setInputMessage] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [aiReply, setAiReply] = useState("Hai sayang... lagi ngapain nih? Mbak Nining kangen tau.");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

  // Fungsi memutar audio dengan proteksi kebijakan autoplay mobile browser
  const playAudioTrack = (url: string) => {
    if (!audioRef.current) return;

    audioRef.current.src = url;
    audioRef.current.load();
    setIsPlayingAudio(true);

    audioRef.current
      .play()
      .catch((err) => {
        console.warn("Autoplay ditahan browser, klik tombol volume untuk memutar manual:", err);
        setIsPlayingAudio(false);
      });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const outgoingText = inputMessage.trim();
    setUserQuery(outgoingText);
    setInputMessage("");
    setIsLoading(true);

    // Buka lock audio browser mobile saat ada sentuhan pengguna
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
    }

    try {
      const response = await fetch(`${backendBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: outgoingText }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setAiReply(data.reply);

      if (data.audio_url) {
        const fullAudioUrl = `${backendBaseUrl}${data.audio_url}?t=${Date.now()}`;
        setCurrentAudioUrl(fullAudioUrl);
        playAudioTrack(fullAudioUrl);
      }
    } catch (err: any) {
      setAiReply("Aduh sayang... servernya lagi ngambek nih, coba sapa Mbak Nining lagi sebentar ya.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReplayAudio = () => {
    if (!audioRef.current || !currentAudioUrl) return;

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#070b14] text-gray-100 flex flex-col justify-between items-center p-4 sm:p-6 select-none">
      {/* Audio Element Hidden */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlayingAudio(false)}
        onError={() => setIsPlayingAudio(false)}
        className="hidden"
      />

      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between py-2 border-b border-rose-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="font-semibold text-sm sm:text-base tracking-wide flex items-center gap-1.5 text-rose-300">
            Mbak Nining <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </h1>
        </div>
        <span className="text-[11px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300">
          ONLINE
        </span>
      </header>

      {/* Avatar Visualizer Area */}
      <div className="w-full max-w-md flex flex-col items-center justify-center my-auto py-6">
        <div className="relative flex items-center justify-center">
          {/* Efek Denyut Suara */}
          <div
            className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-rose-500/20 blur-xl transition-transform duration-500 ${
              isPlayingAudio ? "scale-125 opacity-100 animate-pulse" : "scale-100 opacity-30"
            }`}
          />
          <div
            className={`absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-rose-400/40 transition-all duration-300 ${
              isPlayingAudio ? "scale-110 border-rose-400/80 animate-ping" : "scale-100"
            }`}
          />

          {/* Lingkaran Avatar Utama */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-950 via-slate-900 to-rose-900 border-2 border-rose-400/60 flex items-center justify-center shadow-lg shadow-rose-950/50">
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
            ) : isPlayingAudio ? (
              <Volume2 className="w-10 h-10 text-rose-300 animate-bounce" />
            ) : (
              <Sparkles className="w-10 h-10 text-rose-400" />
            )}
          </div>
        </div>

        {/* Indikator Status Aktivitas */}
        <p className="text-xs text-slate-400 mt-5 tracking-wide">
          {isLoading
            ? "Mbak Nining lagi mikir..."
            : isPlayingAudio
            ? "Mbak Nining sedang bicara..."
            : "Mbak Nining siap mendengarkan"}
        </p>

        {/* Balasan Chat Bubble */}
        <div className="w-full mt-6 space-y-3">
          {userQuery && (
            <div className="flex justify-end">
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-xs sm:text-sm text-slate-200">
                {userQuery}
              </div>
            </div>
          )}

          <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-rose-400 text-[11px] tracking-wider uppercase">
                Mbak Nining
              </span>
              {currentAudioUrl && (
                <button
                  type="button"
                  onClick={toggleReplayAudio}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-300 transition-colors"
                  title="Putar ulang suara"
                >
                  {isPlayingAudio ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <p className="text-slate-200 leading-relaxed">{aiReply}</p>
          </div>
        </div>
      </div>

      {/* Kolom Input Bawah */}
      <footer className="w-full max-w-md pb-2 sm:pb-4">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ajak Mbak Nining ngobrol..."
            disabled={isLoading}
            className="w-full bg-slate-900/90 border border-slate-700/70 focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 rounded-full py-3.5 pl-5 pr-14 text-xs sm:text-sm placeholder-slate-500 text-slate-100 outline-none transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-1.5 w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white flex items-center justify-center transition-all disabled:text-slate-600 active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </footer>
    </main>
  );
}