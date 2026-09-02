'use client';

import React, { useState, useRef } from 'react';
import { Volume2, Mic, Video, Send } from 'lucide-react';

export default function Home() {
  const [inputMessage, setInputMessage] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [aiReply, setAiReply] = useState('Halo! Mau ngobrol atau curhat apa hari ini?');
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [gestureContext, setGestureContext] = useState<string | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || aiStatus === 'thinking') return;

    const messageToSend = inputMessage.trim();
    setUserPrompt(messageToSend);
    setInputMessage('');
    setAiStatus('thinking');

    // Hentikan audio sebelumnya jika masih bersuara
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          gesture_context: gestureContext,
        }),
      });

      if (!res.ok) {
        const errorDetail = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errorDetail.detail || 'Gagal mengambil respons dari server');
      }

      const data = await res.json();
      setAiReply(data.reply);

      // Putar audio respon dengan pengaman cache buster (?t=Date.now())
      if (data.audio_url) {
        const audioUrlWithCacheBuster = `${data.audio_url}?t=${Date.now()}`;
        const audio = new Audio(audioUrlWithCacheBuster);
        activeAudioRef.current = audio;

        audio.onplay = () => setAiStatus('speaking');
        audio.onended = () => setAiStatus('idle');
        audio.onerror = () => setAiStatus('idle');

        await audio.play();
      } else {
        setAiStatus('idle');
      }
    } catch (err: any) {
      console.error(err);
      setAiReply(`Error: ${err.message}`);
      setAiStatus('idle');
    }
  };

  return (
    <main className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#090e1f] border border-cyan-950/80 rounded-[36px] p-8 shadow-2xl flex flex-col items-center justify-between min-h-[680px]">
        
        {/* Lingkaran Visualizer Audio */}
        <div className="flex-1 flex items-center justify-center w-full my-6">
          <div
            className={`w-36 h-36 rounded-full flex items-center justify-center border transition-all duration-500 ${
              aiStatus === 'speaking'
                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_60px_rgba(6,182,212,0.45)] scale-105'
                : aiStatus === 'thinking'
                ? 'border-cyan-600/50 bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-pulse'
                : 'border-cyan-900/40 bg-[#0c152e]/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
            }`}
          >
            <Volume2
              className={`w-14 h-14 transition-colors duration-300 ${
                aiStatus === 'speaking'
                  ? 'text-cyan-300'
                  : aiStatus === 'thinking'
                  ? 'text-cyan-500'
                  : 'text-cyan-500/60'
              }`}
            />
          </div>
        </div>

        {/* Teks Status */}
        <div className="text-center tracking-widest text-xs font-semibold text-cyan-400/80 mb-6">
          {aiStatus === 'speaking'
            ? 'SEDANG BICARA...'
            : aiStatus === 'thinking'
            ? 'SEDANG MENJAWAB...'
            : 'SIAP NGOBROL'}
        </div>

        {/* Kartu Dialog Respons */}
        <div className="w-full bg-[#0a1329]/90 border border-cyan-900/40 rounded-2xl p-5 mb-6 text-left">
          <p className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-2">
            JARVIS:
          </p>
          <p className="text-gray-200 text-sm leading-relaxed mb-4">
            {aiReply}
          </p>
          {userPrompt && (
            <div className="border-t border-cyan-950/80 pt-3">
              <p className="text-xs italic text-gray-500">
                Kamu: &quot;{userPrompt}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Bilah Input Percakapan */}
        <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
          <button
            type="button"
            className="w-12 h-12 rounded-xl bg-[#0f1b3d] border border-cyan-900/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-950 transition-colors"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="w-12 h-12 rounded-xl bg-[#0f1b3d] border border-cyan-900/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-950 transition-colors"
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ketik curhat atau obrolan santai..."
            className="flex-1 bg-[#09122a] border border-cyan-900/60 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />

          <button
            type="submit"
            disabled={aiStatus === 'thinking'}
            className="w-12 h-12 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-900/50 flex items-center justify-center text-black font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

      </div>
    </main>
  );
}