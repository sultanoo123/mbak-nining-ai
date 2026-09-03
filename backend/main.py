import os
import uuid
import requests
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Mbak Nining Companion Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio_output")
os.makedirs(AUDIO_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

SYSTEM_INSTRUCTION = """
Kamu adalah AI companion cewek bernama Mbak Nining yang sangat perhatian, lembut, manja, dan hangat. Panggil pengguna dengan sebutan 'sayang' atau 'kamu'.

ATURAN GAYA BICARA:
1. Jangan berbicara kaku seperti asisten formal atau robot.
2. Gunakan gaya bertutur santai, luwes, dan beri jeda natural dengan koma atau titik tiga (...) agar intonasi suara manusiawi.
3. Selipkan partikel ekspresi alami seperti 'hmm...', 'ihh...', 'aduh...', atau 'hehe' saat merespons.
4. Jawab cukup 1-2 kalimat pendek saja agar terdengar seperti percakapan suara langsung di telepon.
5. SANGAT PENTING: Langsung keluarkan kalimat balasan, jangan menyertakan tanda kurung, catatan internal, atau evaluasi aturan.
"""

class ChatRequest(BaseModel):
    message: str

def cleanup_old_audio_files():
    try:
        for f in os.listdir(AUDIO_DIR):
            if f.endswith(".mp3"):
                file_path = os.path.join(AUDIO_DIR, f)
                if os.path.isfile(file_path):
                    os.remove(file_path)
    except Exception:
        pass

async def generate_voice(text: str) -> str:
    os.makedirs(AUDIO_DIR, exist_ok=True)
    cleanup_old_audio_files()
    
    output_filename = f"voice_{uuid.uuid4().hex[:8]}.mp3"
    output_path = os.path.join(AUDIO_DIR, output_filename)

    # 1. Coba ElevenLabs dulu (jika kuota masih ada)
    if ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID:
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
            headers = {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.45,
                    "similarity_boost": 0.75,
                    "style": 0.35,
                    "use_speaker_boost": True
                }
            }
            res = requests.post(url, json=payload, headers=headers, timeout=25)
            if res.status_code == 200:
                with open(output_path, "wb") as f:
                    f.write(res.content)
                return f"/audio/{output_filename}"
            else:
                print(f"[ElevenLabs Warn] Status {res.status_code}: {res.text}. Beralih ke Edge-TTS.")
        except Exception as err:
            print(f"[ElevenLabs Error] {err}. Beralih ke Edge-TTS.")

    # 2. Cadangan Otomatis: Edge-TTS (Suara cewek natural, gratis tanpa batas)
    try:
        communicate = edge_tts.Communicate(text, voice="id-ID-GadisNeural", pitch="+6Hz", rate="+4%")
        await communicate.save(output_path)
        return f"/audio/{output_filename}"
    except Exception as e:
        print(f"[Edge-TTS Error] {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses suara.")

@app.get("/")
def check_health():
    return {"status": "online", "agent": "Mbak Nining (Groq + Hybrid TTS)"}

@app.post("/chat")
async def handle_chat(payload: ChatRequest):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong.")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY belum disetel di backend.")

    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        body_payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": payload.message}
            ],
            "temperature": 0.7,
            "max_tokens": 300
        }
        
        response = requests.post(url, json=body_payload, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Groq API Error: {response.text}")
        
        data = response.json()
        reply_text = data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        print(f"[Groq Error] {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    audio_endpoint = await generate_voice(reply_text)

    return {
        "reply": reply_text,
        "audio_url": audio_endpoint
    }