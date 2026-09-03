"use client";

import React from "react";

interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandHelperModal: React.FC<CommandModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const commandList = [
    {
      app: "Spotify",
      icon: "🎵",
      trigger: "setel lagu [judul lagu]",
      example: "Tolong setel lagu Menemukanmu Seventeen di Spotify"
    },
    {
      app: "YouTube",
      icon: "▶️",
      trigger: "buka youtube / cari [topik] di youtube",
      example: "Cari tutorial machine learning di YouTube"
    },
    {
      app: "WhatsApp",
      icon: "💬",
      trigger: "buka whatsapp / buka wa",
      example: "Mbak Nining, tolong buka WhatsApp"
    },
    {
      app: "Instagram",
      icon: "📸",
      trigger: "buka instagram / buka ig",
      example: "Buka Instagram dong"
    },
    {
      app: "Mobile Legends",
      icon: "⚔️",
      trigger: "buka ml / main mobile legends",
      example: "Gua mau main Mobile Legends"
    },
    {
      app: "PUBG Mobile",
      icon: "🪖",
      trigger: "buka pubg / main pubg",
      example: "Ayo buka PUBG sekarang"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-800">📖 Catatan Perintah Suara</h3>
          <button
            suppressHydrationWarning
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Ucapkan kata kunci berikut saat menekan tombol mikrofon:
        </p>

        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {commandList.map((cmd, idx) => (
            <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cmd.icon}</span>
                <span className="font-semibold text-sm text-gray-800">{cmd.app}</span>
              </div>
              <p className="mt-1 text-xs font-mono font-medium text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 inline-block">
                Pola: {cmd.trigger}
              </p>
              <p className="mt-1 text-xs text-gray-600 italic">
                "{cmd.example}"
              </p>
            </div>
          ))}
        </div>

        <button
          suppressHydrationWarning
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};