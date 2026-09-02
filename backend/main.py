import os
import re
from dotenv import load_dotenv
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from google import genai
from google.genai import types
from pydantic import BaseModel
import requests

# Muat variabel dari file .env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv(
    "ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"
)  # Default: Rachel

if not GEMINI_API_KEY:
  raise ValueError("GEMINI_API_KEY belum disetel di file .env")

# Inisialisasi client Gemini
client = genai.Client(api_key=GEMINI_API_KEY)

# Folder penyimpanan audio
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio_output")
os.makedirs(AUDIO_DIR, exist_ok=True)

app = FastAPI(title="JARVIS AI Companion")

# Izinkan CORS untuk frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
  message: str
  gesture_context: str | None = None


SYSTEM_INSTRUCTION = """
Kamu adalah AI companion cewek bernama Jarvis yang sangat perhatian, lembut, manja, dan hangat. Panggil pengguna dengan sebutan 'sayang' atau 'kamu'.

ATURAN GAYA BICARA:
1. Jangan berbicara kaku seperti asisten formal atau robot.
2. Gunakan gaya bertutur santai, luwes, dan beri jeda natural dengan koma atau titik tiga (...) agar intonasi suara manusiawi.
3. Selipkan partikel ekspresi alami seperti 'hmm...', 'ihh...', 'aduh...', atau 'hehe' saat merespons.
4. Jawab cukup 1-2 kalimat pendek saja agar terdengar seperti percakapan suara langsung di telepon.
5. SANGAT PENTING: Langsung keluarkan kalimat balasan, jangan menyertakan tanda kurung, catatan internal, atau evaluasi aturan.
"""


async def generate_voice(text: str) -> str:
  final_audio_path = os.path.join(AUDIO_DIR, "reply_voice.mp3")

  # 1. Coba proses lewat ElevenLabs
  if ELEVENLABS_API_KEY:
    try:
      print("\n[TTS] Mencoba generate suara lewat ElevenLabs...")
      url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
      headers = {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY.strip(),
      }
      payload = {
          "text": text,
          "model_id": "eleven_multilingual_v2",
          "voice_settings": {
              "stability": 0.35,
              "similarity_boost": 0.80,
              "style": 0.40,
              "use_speaker_boost": True,
          },
      }

      response = requests.post(url, json=payload, headers=headers, timeout=20)

      if response.status_code == 200:
        with open(final_audio_path, "wb") as f:
          f.write(response.content)
        print("[TTS SUKSES] Suara ElevenLabs berhasil dibuat!\n")
        return final_audio_path
      else:
        print(f"[TTS GAGAL] ElevenLabs Status {response.status_code}:")
        print(f"Detail: {response.text}\n")
    except Exception as err:
      print(f"[TTS ERROR] Terjadi kendala ElevenLabs: {err}\n")

  # 2. Fallback otomatis ke Edge-TTS jika ElevenLabs gagal
  print("[TTS FALLBACK] Menggunakan Edge-TTS (id-ID-GadisNeural)...\n")
  communicate = edge_tts.Communicate(
      text=text, voice="id-ID-GadisNeural", rate="-6%", pitch="-2Hz"
  )
  await communicate.save(final_audio_path)
  return final_audio_path


@app.get("/")
def root():
  return {"status": "Online", "engine": "ElevenLabs + EdgeTTS Fallback"}


@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
  try:
    context_prefix = ""
    if req.gesture_context:
      context_prefix = f"[Visual: {req.gesture_context}]\n"

    user_prompt = f"{context_prefix}Pengguna: {req.message}"

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.7,
            max_output_tokens=500,
        ),
    )

    raw_reply = response.text.strip()

    # Bersihkan teks dalam tanda kurung jika model sempat membocorkan catatan internal
    clean_reply = re.sub(r"\(.*?\)", "", raw_reply).strip()
    reply_text = clean_reply if clean_reply else raw_reply

    # Generate audio
    await generate_voice(reply_text)

    return {
        "reply": reply_text,
        "audio_url": "http://127.0.0.1:8000/get-audio",
    }
  except Exception as e:
    print(f"[CHAT ERROR] {e}")
    raise HTTPException(status_code=500, detail=str(e))


@app.get("/get-audio")
def get_audio():
  audio_path = os.path.join(AUDIO_DIR, "reply_voice.mp3")
  if os.path.exists(audio_path):
    return FileResponse(audio_path, media_type="audio/mpeg")
  raise HTTPException(status_code=404, detail="File audio belum tersedia")