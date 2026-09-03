"use client";

import React, { useState, useEffect, useRef } from "react";
import { executeAppCommand } from "@/utils/appLauncher";
import { CommandHelperModal } from "@/components/CommandHelperModal";

interface Message {
  id: string;
  sender: "user" | "nining";
  text: string;
  timestamp: string;
}

export default function NiningAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Muat riwayat chat dari localStorage & inisialisasi daftar suara browser
  useEffect(() => {
    const savedChat = localStorage.getItem("nining_chat_history");
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error("Gagal membaca riwayat chat:", e);
      }
    } else {
      const greeting: Message = {
        id: "init",
        sender: "nining",
        text: "Hai sayang! Ada yang bisa Mbak Nining bantu? Mau puter lagu, buka sosmed, atau ngobrol santai aja?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages([greeting]);
    }

    // Inisialisasi awal daftar suara browser agar siap digunakan jika fallback
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Simpan riwayat chat & auto scroll ke bawah
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("nining_chat_history", JSON.stringify(messages));
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 2. Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.lang = "id-ID";
      recognizer.interimResults = false;

      recognizer.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleIncomingInput(transcript);
      };

      recognizer.onerror = () => setIsListening(false);
      recognizer.onend = () => setIsListening(false);

      recognitionRef.current = recognizer;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 3. Fallback Suara Cewek Browser (Jika ElevenLabs mati/kuota habis)
  const fallbackFemaleVoice = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";

    const voices = window.speechSynthesis.getVoices();

    const femaleVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        (v.lang.includes("id") || v.lang.includes("ID")) &&
        (name.includes("gadis") ||
          name.includes("siti") ||
          name.includes("female") ||
          name.includes("wanita") ||
          name.includes("google"))
      );
    }) || voices.find((v) => v.lang.includes("id") || v.lang.includes("ID"));

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.pitch = 1.25; // Pitch dinaikkan agar bersuara cewek manis
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // 4. Pemutar Audio Utama (ElevenLabs + Fallback)
  const playVoiceResponse = (audioSource: string | null, fallbackText: string) => {
    if (audioSource && audioSource.length > 20) {
      setIsSpeaking(true);
      const audio = new Audio(audioSource);
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.onended = () => setIsSpeaking(false);
          })
          .catch((err) => {
            console.warn("Autoplay audio ElevenLabs ditahan browser, beralih ke suara lokal:", err);
            fallbackFemaleVoice(fallbackText);
          });
      }
      audio.onerror = () => {
        setIsSpeaking(false);
        fallbackFemaleVoice(fallbackText);
      };
    } else {
      fallbackFemaleVoice(fallbackText);
    }
  };

  const pushAssistantReply = (text: string) => {
    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + Math.random()).toString(),
        sender: "nining",
        text,
        timestamp: timeString
      }
    ]);
  };

  // 5. Penanganan Input Pengguna Terpusat (Bicara / Ketik)
  const handleIncomingInput = async (rawInput: string) => {
    const userText = rawInput.trim();
    if (!userText) return;

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: timeString
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoadingReply(true);

    try {
      // Kirim input langsung ke backend /api/chat
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply || "Iya sayang, Mbak Nining dengerin kok.";

      // A. Tampilkan Balasan Teks Mbak Nining
      pushAssistantReply(aiReply);

      // B. Putar Suara Balasan (ElevenLabs atau Fallback Cewek)
      playVoiceResponse(data.audio || data.audioUrl, aiReply);

      // C. Eksekusi Perintah Aplikasi jika Intent terdeteksi oleh backend
      // Eksekusi perintah aplikasi jika Intent terdeteksi oleh backend
      if (data.intent) {
        setTimeout(() => {
          executeAppCommand(data.intent, data.payload || "");
        }, 200);
      }

    } catch (err: any) {
      const errorMsg = `Aduh sayang, ada masalah koneksi nih: ${err.message}`;
      pushAssistantReply(errorMsg);
      fallbackFemaleVoice("Aduh sayang, ada sedikit gangguan koneksi.");
    } finally {
      setIsLoadingReply(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem("nining_chat_history");
    const greeting: Message = {
      id: Date.now().toString(),
      sender: "nining",
      text: "Riwayat obrolan sudah bersih! Mau ngobrolin apa lagi sama Mbak Nining?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages([greeting]);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-rose-50/40 selection:bg-rose-200">
      {/* Header Elegan & Hangat */}
      <header className="flex items-center justify-between border-b border-rose-100 bg-white/85 px-6 py-3.5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {/* Avatar Interaktif */}
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 text-lg font-bold text-white shadow-md shadow-rose-200">
              N
            </div>
            {isSpeaking ? (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-pink-500 border-2 border-white"></span>
              </span>
            ) : (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"></span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-800 tracking-tight">Mbak Nining</h1>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {isSpeaking ? "Lagi bicara..." : isListening ? "Mendengarkanmu..." : "Asisten Setiamu ✨"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            suppressHydrationWarning
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 hover:text-rose-700"
          >
            <span>📖</span>
            <span>Perintah</span>
          </button>
          <button
            onClick={clearHistory}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            title="Bersihkan Percakapan"
          >
            🗑️
          </button>
        </div>
      </header>

      {/* Main Area: Percakapan & Status Visual */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-24 lg:px-48 space-y-4">
        {/* Visualizer Status Avatar Mini di Tengah Chat */}
        <div className="flex flex-col items-center justify-center py-4">
          <div
            onClick={toggleListening}
            className={`cursor-pointer group relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500 ${
              isSpeaking
                ? "scale-110 shadow-2xl shadow-pink-300 ring-8 ring-pink-100"
                : isListening
                ? "scale-110 shadow-2xl shadow-rose-300 ring-8 ring-rose-200 animate-pulse"
                : "hover:scale-105 shadow-lg shadow-rose-100 ring-4 ring-white"
            } bg-gradient-to-tr from-rose-400 via-pink-400 to-rose-300`}
          >
            <span className="text-3xl filter drop-shadow">
              {isSpeaking ? "✨" : isListening ? "🎙️" : "🌸"}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-400">
            {isListening
              ? "Katakan sesuatu sayang..."
              : isSpeaking
              ? "Mbak Nining sedang menjawab..."
              : "Klik bunga untuk mulai bicara"}
          </p>
        </div>

        {/* Bubble Obrolan */}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            {m.sender === "nining" && (
              <span className="mb-1 ml-1 text-[11px] font-semibold text-rose-500">
                Mbak Nining ❤️
              </span>
            )}
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition ${
                m.sender === "user"
                  ? "bg-gradient-to-tr from-rose-500 to-pink-500 text-white rounded-tr-none shadow-rose-200"
                  : "bg-white text-slate-800 rounded-tl-none border border-rose-100/70 shadow-sm"
              }`}
            >
              {m.text}
            </div>
            <span className="mt-1 px-1.5 text-[10px] text-slate-400">{m.timestamp}</span>
          </div>
        ))}

        {isLoadingReply && (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pl-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce"></span>
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce [animation-delay:0.2s]"></span>
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce [animation-delay:0.4s]"></span>
            <span>Mbak Nining lagi mikir...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Input Bar Elegan */}
      <footer className="border-t border-rose-100 bg-white/95 p-3.5 shadow-lg backdrop-blur-md md:px-24 lg:px-48">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleIncomingInput(inputText);
          }}
          className="flex items-center gap-2.5"
        >
          {/* Tombol Mikrofon */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition shadow-md ${
              isListening
                ? "bg-red-500 text-white shadow-red-200 ring-4 ring-red-100 animate-pulse"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700"
            }`}
          >
            🎙️
          </button>

          {/* Kotak Teks Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Mbak Nining lagi dengerin kamu..." : "Ketik pesan atau panggil Mbak Nining..."}
            className="flex-1 rounded-2xl border border-rose-200/80 bg-rose-50/20 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-100 transition"
          />

          {/* Tombol Kirim */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoadingReply}
            className="flex h-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 px-5 text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:opacity-90 disabled:opacity-40"
          >
            Kirim
          </button>
        </form>
      </footer>

      {/* Modal Petunjuk Perintah */}
      <CommandHelperModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}