#!/bin/sh
set -eu

MODEL_NAME="${PIPER_MODEL:-pt_BR-cadu-medium}"
MODEL_DIR="${PIPER_MODEL_DIR:-/models}"
MODEL_PATH="$MODEL_DIR/$MODEL_NAME.onnx"

mkdir -p "$MODEL_DIR"
chown piper:piper "$MODEL_DIR"

if [ ! -s "$MODEL_PATH" ] || [ ! -s "$MODEL_PATH.json" ]; then
  gosu piper python -m piper.download_voices --data-dir "$MODEL_DIR" "$MODEL_NAME"
fi

exec gosu piper uvicorn server:app --host 0.0.0.0 --port 5000 --workers 1
