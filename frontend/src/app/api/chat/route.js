import { NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `
Kamu adalah AI companion cewek bernama Mbak Nining yang sangat perhatian, lembut, manja, dan hangat. Panggil pengguna dengan sebutan 'sayang' atau 'kamu'.

ATURAN GAYA BICARA:
1. Jangan berbicara kaku seperti asisten formal atau robot.
2. Gunakan gaya bertutur santai, luwes, dan beri jeda natural dengan koma atau titik tiga (...) agar intonasi suara manusiawi.
3. Selipkan partikel ekspresi alami seperti 'hmm...', 'ihh...', 'aduh...', atau 'hehe' saat merespons.
4. Jawab cukup 1-2 kalimat pendek saja agar terdengar seperti percakapan suara langsung di telepon.
5. SANGAT PENTING: Langsung keluarkan kalimat balasan, jangan menyertakan tanda kurung, catatan internal, atau evaluasi aturan.
`;

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ detail: "Pesan tidak boleh kosong." }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ detail: "GEMINI_API_KEY belum disetel di Vercel." }, { status: 500 });
    }

    // 1. Panggil Google Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ detail: `Gagal panggil Gemini: ${errText}` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Hmm... Mbak Nining lagi ngantuk nih, sayang.";

    // 2. Panggil ElevenLabs
    let audioUrl = null;
    if (ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID) {
      try {
        const elevenRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: replyText,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.45,
                similarity_boost: 0.75,
                style: 0.35,
                use_speaker_boost: true
              }
            })
          }
        );

        if (elevenRes.ok) {
          const arrayBuffer = await elevenRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        }
      } catch (audioErr) {
        console.error("ElevenLabs error:", audioErr);
      }
    }

    return NextResponse.json({
      reply: replyText,
      audio_url: audioUrl
    });

  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}