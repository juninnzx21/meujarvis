FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIPER_MODEL=pt_BR-cadu-medium \
    PIPER_MODEL_DIR=/models

RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin piper

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir "piper-tts==1.3.0" "fastapi==0.115.12" "uvicorn==0.34.2"

WORKDIR /app
COPY server.py entrypoint.sh ./
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod 0555 /app/entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
