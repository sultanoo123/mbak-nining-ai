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

    // 1. Panggil Groq Cloud
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
            content: "Kamu adalah Mbak Nining, seorang wanita Indonesia yang manis, perhatian, hangat, dan santai. Balaslah pesan dengan gaya percakapan akrab khas perempuan Indonesia, hindari jawaban yang kaku seperti robot, dan buat balasan tetap singkat padat (1-3 kalimat) tanpa simbol markdown yang rumit."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json({ detail: `Gagal panggil Groq: ${errText}` }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const replyText = groqData.choices?.[0]?.message?.content?.trim() || "Halo! Ada yang bisa Mbak Nining bantu?";

    // 2. Bersihkan emoji & tanda markdown sebelum dikirim ke TTS agar lafal suara jernih
    const cleanTextForTTS = replyText
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*_~`#]/g, '')
      .trim();

    // 3. Panggil ElevenLabs untuk Voice (TTS)
    let audioDataUri = null;
    let audioRawBase64 = null;

    if (ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID && cleanTextForTTS.length > 0) {
      try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: cleanTextForTTS,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (ttsRes.ok) {
          const arrayBuffer = await ttsRes.arrayBuffer();
          audioRawBase64 = Buffer.from(arrayBuffer).toString("base64");
          audioDataUri = `data:audio/mp3;base64,${audioRawBase64}`;
        } else {
          console.error("Gagal dari ElevenLabs:", await ttsRes.text());
        }
      } catch (ttsErr) {
        console.error("Gagal generate audio:", ttsErr);
      }
    }

    // Mengembalikan response (audio dikirim dalam format data URI dan raw agar kompatibel dengan ragam pemutar frontend)
    return NextResponse.json({
      response: replyText,
      reply: replyText,
      text: replyText,
      audio: audioDataUri || audioRawBase64,
      audioUrl: audioDataUri,
      audioBase64: audioRawBase64
    });

  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}