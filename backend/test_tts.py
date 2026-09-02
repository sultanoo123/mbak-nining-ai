import os
from dotenv import load_dotenv
import requests

load_dotenv()

api_key = os.getenv("ELEVENLABS_API_KEY")
voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

print(
    f"Memeriksa Key: {api_key[:8]}... (Panjang: {len(api_key) if api_key else 0})"
)
print(f"Voice ID: {voice_id}")

url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": api_key.strip() if api_key else "",
}
payload = {
    "text": (
        "Halo sayang... aku ada di sini kok nemenin kamu. Gimana suara aku"
        " sekarang?"
    ),
    "model_id": "eleven_multilingual_v2",
}

res = requests.post(url, json=payload, headers=headers)
print("HTTP Status:", res.status_code)

if res.status_code == 200:
  with open("test_output.mp3", "wb") as f:
    f.write(res.content)
  print("SUKSES: File 'test_output.mp3' berhasil dibuat! Coba putar file ini.")
else:
  print("GAGAL:", res.text)