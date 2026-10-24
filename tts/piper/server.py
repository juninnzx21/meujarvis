import asyncio
import io
import os
import wave
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from piper import PiperVoice

MODEL_NAME = os.environ.get("PIPER_MODEL", "pt_BR-cadu-medium")
MODEL_PATH = Path(os.environ.get("PIPER_MODEL_DIR", "/models")) / f"{MODEL_NAME}.onnx"
voice = PiperVoice.load(str(MODEL_PATH), use_cuda=False)
synthesis_lock = Lock()
app = FastAPI(title="JARVIS local Piper TTS", docs_url=None, redoc_url=None, openapi_url=None)


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


def synthesize(text: str) -> bytes:
    output = io.BytesIO()
    with synthesis_lock, wave.open(output, "wb") as wav_file:
        voice.synthesize_wav(text.strip(), wav_file)
    return output.getvalue()


@app.post("/synthesize")
async def synthesize_route(payload: SynthesisRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="O texto não pode ficar vazio.")
    audio = await asyncio.to_thread(synthesize, text)
    return Response(content=audio, media_type="audio/wav", headers={"Cache-Control": "no-store"})
