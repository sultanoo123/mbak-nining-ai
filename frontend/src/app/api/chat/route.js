import { NextResponse } from 'next/server';

// Helper untuk mengekstrak intent & payload aplikasi dari pesan user
function parseAppIntent(userMessage) {
  const text = userMessage.toLowerCase().trim();

  const cleanQuery = (rawText, keywordsToRemove) => {
    let result = rawText;
    keywordsToRemove.forEach((regex) => {
      result = result.replace(regex, "");
    });
    return result.trim();
  };

  // 1. YOUTUBE
  if (text.includes("youtube") || text.includes("yt")) {
    const payload = cleanQuery(text, [
      /buka\s+youtube/g, /buka\s+yt/g, /open\s+youtube/g, /cari\s+di\s+youtube/g,
      /cari/g, /nonton/g, /putarkan/g, /di\s+youtube/g, /di\s+yt/g, /youtube/g, /yt/g
    ]);
    const isOnlyOpen = !payload || payload === "buka" || payload === "open";
    return {
      isAppCommand: true,
      intent: "youtube",
      payload: isOnlyOpen ? "" : payload,
      aiReply: isOnlyOpen
        ? "Siap sayang! Mbak Nining bukahin YouTube ya."
        : `Siap sayang! Mbak Nining carikan "${payload}" di YouTube ya.`
    };
  }

  // 2. SPOTIFY
  if (text.includes("spotify")) {
    const payload = cleanQuery(text, [
      /buka\s+spotify/g, /open\s+spotify/g, /setel\s+lagu/g, /putar\s+lagu/g,
      /play\s+lagu/g, /dengarkan/g, /di\s+spotify/g, /spotify/g
    ]);
    const isOnlyOpen = !payload || payload === "buka" || payload === "open";
    return {
      isAppCommand: true,
      intent: "spotify",
      payload: isOnlyOpen ? "" : payload,
      aiReply: isOnlyOpen
        ? "Siap sayang! Mbak Nining bukahin aplikasi Spotify ya."
        : `Siap sayang! Mbak Nining puterin lagu "${payload}" di Spotify ya.`
    };
  }

  // 3. WHATSAPP
  if (text.includes("whatsapp") || text.includes("wa")) {
    const payload = cleanQuery(text, [
      /buka\s+whatsapp/g, /buka\s+wa/g, /open\s+whatsapp/g, /kirim\s+pesan/g,
      /chat/g, /whatsapp/g, /wa/g
    ]);
    const isOnlyOpen = !payload || payload === "buka" || payload === "open";
    return {
      isAppCommand: true,
      intent: "whatsapp",
      payload: isOnlyOpen ? "" : payload,
      aiReply: isOnlyOpen
        ? "Siap sayang! Mbak Nining bukahin WhatsApp ya."
        : `Siap sayang! Mbak Nining bukain WhatsApp buat kirim pesan: "${payload}".`
    };
  }

  // 4. INSTAGRAM
  if (text.includes("instagram") || text.includes("ig")) {
    return {
      isAppCommand: true,
      intent: "instagram",
      payload: "",
      aiReply: "Siap sayang! Mbak Nining bukahin Instagram ya."
    };
  }

  // 5. MOBILE LEGENDS
  if (text.includes("mobile legends") || text.includes("mobile legend") || text.includes("mlbb") || /\bml\b/.test(text)) {
    return {
      isAppCommand: true,
      intent: "mlbb",
      payload: "",
      aiReply: "Siap sayang! Mbak Nining bukahin Mobile Legends. Selamat bermain!"
    };
  }

  // 6. PUBG MOBILE
  if (text.includes("pubg") || text.includes("pubgm")) {
    return {
      isAppCommand: true,
      intent: "pubg",
      payload: "",
      aiReply: "Siap sayang! Mbak Nining bukahin PUBG Mobile. Winner Winner Chicken Dinner ya!"
    };
  }

  return { isAppCommand: false, intent: "", payload: "", aiReply: "" };
}

// Helper untuk panggil API ElevenLabs
async function generateElevenLabsSpeech(text, apiKey, voiceId) {
  if (!apiKey || !voiceId) return null;

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.80,
            style: 0.30,
            use_speaker_boost: true
          }
        })
      }
    );

    if (elevenRes.ok) {
      const audioBuffer = await elevenRes.arrayBuffer();
      const base64String = Buffer.from(audioBuffer).toString("base64");
      return `data:audio/mpeg;base64,${base64String}`;
    } else {
      console.error("ElevenLabs Error:", await elevenRes.text());
      return null;
    }
  } catch (err) {
    console.error("Gagal memanggil ElevenLabs API:", err);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message || "";

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    // 1. Cek apakah pesan user merupakan perintah aplikasi
    const appCommand = parseAppIntent(userMessage);

    let replyText = "";
    let intent = null;
    let payload = null;

    if (appCommand.isAppCommand) {
      // Jika perintah aplikasi, gunakan respons khusus tanpa memanggil Groq
      replyText = appCommand.aiReply;
      intent = appCommand.intent;
      payload = appCommand.payload;
    } else {
      // Jika BUKAN perintah aplikasi, panggil Groq AI
      if (!GROQ_API_KEY) {
        return NextResponse.json(
          { detail: "GROQ_API_KEY belum disetel di environment variables." },
          { status: 500 }
        );
      }

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: "Kamu adalah Mbak Nining, cewek umur 18 tahun yang super ramah, manis, perhatian, dan lucu. Gaya bicaramu santai sehari-hari (pakai 'aku-kamu', 'deh', 'ya', 'eh', 'hihi'), imut, tidak kaku, dan tidak panjang-panjang. Jawab cukup 1-2 kalimat pendek saja seperti lagi balas chat orang tersayang."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.8,
          max_tokens: 300
        })
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return NextResponse.json({ detail: `Gagal panggil Groq: ${errText}` }, { status: 500 });
      }

      const groqData = await groqRes.json();
      replyText = groqData.choices?.[0]?.message?.content?.trim() || "Iya sayang, Mbak Nining di sini kok!";
    }

    // 2. Generate Suara dengan ElevenLabs
    const audioBase64 = await generateElevenLabsSpeech(replyText, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID);

    // 3. Kembalikan data lengkap ke frontend
    return NextResponse.json({
      reply: replyText,
      audio: audioBase64,
      intent: intent,
      payload: payload
    });

  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}