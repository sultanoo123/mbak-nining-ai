import fs from "fs";

let env = {};
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  envContent.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
} catch (e) {
  console.error("❌ Gagal membaca .env.local:", e.message);
}

const API_KEY = env.ELEVENLABS_API_KEY;
const VOICE_ID = env.ELEVENLABS_VOICE_ID;

console.log("📌 Testing ElevenLabs...");
console.log("🗣️ Voice ID yang dites:", VOICE_ID);

if (!API_KEY || !VOICE_ID) {
  console.error("❌ Key/Voice ID tidak ditemukan di .env.local!");
  process.exit(1);
}

async function testVoice() {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
      },
      body: JSON.stringify({
        text: "Halo sayang, ini tes suara Mbak Nining.",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.80,
          style: 0.30
        }
      })
    });

    if (!res.ok) {
      console.error("❌ Gagal! Status:", res.status);
      console.error("❌ Detail Error:", await res.text());
    } else {
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync("test_output.mp3", Buffer.from(arrayBuffer));
      console.log("✅ SUKSES! File test_output.mp3 berhasil dibuat!");
    }
  } catch (err) {
    console.error("❌ Error koneksi:", err.message);
  }
}

testVoice();