import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message || body.text || "";

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { detail: "GROQ_API_KEY belum disetel di Vercel Environment Variables." },
        { status: 500 }
      );
    }

    // 1. Panggil Groq Cloud (Model Llama 3.3 70B - Cepat, pintar & kuota super longgar)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Kamu adalah Mbak Nining, seorang wanita Indonesia yang manis, perhatian, hangat, dan santai. Balaslah pesan dengan gaya percakapan akrab khas perempuan Indonesia, hindari jawaban yang kaku seperti robot, dan buat balasan tetap singkat padat (1-3 kalimat) agar nyaman didengar saat diucapkan."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 250
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json({ detail: `Gagal panggil Groq: ${errText}` }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const replyText = groqData.choices?.[0]?.message?.content || "Halo! Ada yang bisa Mbak Nining bantu?";

    // 2. Panggil ElevenLabs untuk Voice (TTS)
    let audioBase64 = null;
    if (ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID) {
      try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: replyText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (ttsRes.ok) {
          const arrayBuffer = await ttsRes.arrayBuffer();
          audioBase64 = Buffer.from(arrayBuffer).toString("base64");
        }
      } catch (ttsErr) {
        console.error("Gagal generate audio:", ttsErr);
      }
    }

    // Mengembalikan response teks dan audio base64 ke frontend
    return NextResponse.json({
      response: replyText,
      reply: replyText,
      text: replyText,
      audio: audioBase64
    });

  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}