import json
import os
import logging
import hashlib
from typing import Optional, Dict

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import tensorflow as tf
import keras

from modeling import (
    build_and_load_captioning,
    preprocess_image_bytes,
    greedy_caption,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

ARTIFACTS_DIR = os.environ.get("CAPTIONING_ARTIFACTS_DIR", "captioning-model")
WEIGHTS_PATH = os.environ.get(
    "CAPTIONING_WEIGHTS_PATH", os.path.join(ARTIFACTS_DIR, "caption_model.weights.h5")
)
VOCAB_PATH = os.environ.get("CAPTIONING_VOCAB_PATH", os.path.join(ARTIFACTS_DIR, "vocab.json"))
METADATA_PATH = os.environ.get("CAPTIONING_METADATA_PATH", os.path.join(ARTIFACTS_DIR, "metadata.json"))

app = FastAPI(title="Captioning API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

artifacts = None
artifacts_sha256: Optional[Dict[str, str]] = None


def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def _file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


@app.on_event("startup")
async def startup_event():
    global artifacts, artifacts_sha256

    # Run on CPU (stable and predictable for Docker)
    try:
        tf.config.set_visible_devices([], "GPU")
    except Exception:
        pass
    # Best effort for determinism (does not guarantee cross-version, but reduces variation).
    try:
        tf.config.experimental.enable_op_determinism(True)
    except Exception:
        pass

    for p in [WEIGHTS_PATH, VOCAB_PATH, METADATA_PATH]:
        if not os.path.exists(p):
            raise RuntimeError(
                f"Artefato não encontrado: {p}. "
                f"Treine e exporte pelo notebook para {ARTIFACTS_DIR}/."
            )

    vocab = _load_json(VOCAB_PATH)
    metadata = _load_json(METADATA_PATH)

    image_size = tuple(metadata["image_size"])
    artifacts = build_and_load_captioning(
        weights_path=WEIGHTS_PATH,
        vocab=vocab,
        image_size=image_size,
        seq_length=int(metadata["seq_length"]),
        vocab_size=int(metadata["vocab_size"]),
        embed_dim=int(metadata["embed_dim"]),
        ff_dim=int(metadata["ff_dim"]),
        encoder_num_heads=int(metadata.get("encoder_num_heads", 2)),
        decoder_num_heads=int(metadata.get("decoder_num_heads", 3)),
        strip_chars=str(metadata.get("strip_chars", "!\"#$%&'()*+,-./:;=?@[\\]^_`{|}~1234567890")),
    )

    # Hashes to ensure that the container is using the same artifacts as the notebook.
    artifacts_sha256 = {
        "weights": _file_sha256(WEIGHTS_PATH),
        "vocab": _file_sha256(VOCAB_PATH),
        "metadata": _file_sha256(METADATA_PATH),
    }

    logger.info("Captioning artifacts carregados de %s", ARTIFACTS_DIR)
    logger.info(
        "Artefatos sha256 weights=%s vocab=%s metadata=%s",
        artifacts_sha256["weights"],
        artifacts_sha256["vocab"],
        artifacts_sha256["metadata"],
    )
    # Sanity checks useful to detect vocabulary/token id mismatch.
    try:
        v = artifacts.vectorizer.get_vocabulary()
        start_id = int(artifacts.vectorizer(["<start>"]).numpy()[0][0])
        end_id = int(artifacts.vectorizer(["<end>"]).numpy()[0][0])
        logger.info("Vectorizer vocab head: %s", v[:8])
        logger.info("Token ids: <start>=%s <end>=%s", start_id, end_id)
    except Exception as e:
        logger.warning("Falha no sanity-check do vectorizer: %s", e)


@app.get("/")
async def root():
    return {"message": "Captioning API está funcionando!", "status": "online"}


@app.get("/health")
async def health():
    ok = artifacts is not None
    return {
        "status": "ok" if ok else "starting",
        "artifacts_dir": ARTIFACTS_DIR,
        "weights_path": WEIGHTS_PATH,
        "vocab_path": VOCAB_PATH,
        "metadata_path": METADATA_PATH,
        "sha256": artifacts_sha256,
        "runtime": {
            "tensorflow": getattr(tf, "__version__", None),
            "keras": getattr(keras, "__version__", None),
            "TF_ENABLE_ONEDNN_OPTS": os.environ.get("TF_ENABLE_ONEDNN_OPTS"),
        },
    }


@app.post("/caption")
async def caption_image(file: UploadFile = File(...), debug: bool = Query(False)):
    global artifacts
    if artifacts is None:
        raise HTTPException(status_code=503, detail="Modelo ainda não carregou.")

    try:
        image_bytes = await file.read()
        file_sha256 = hashlib.sha256(image_bytes).hexdigest()
        logger.info(
            "POST /caption file=%s content_type=%s size=%d sha256=%s",
            getattr(file, "filename", None),
            getattr(file, "content_type", None),
            len(image_bytes),
            file_sha256,
        )

        image_arr = preprocess_image_bytes(image_bytes, artifacts.image_size)
        caption = greedy_caption(image_array=image_arr, artifacts=artifacts)
        resp = {"success": True, "caption": caption}
        if debug:
            resp.update(
                {
                    "debug": {
                        "sha256": file_sha256,
                        "bytes": len(image_bytes),
                        "image_mean": float(image_arr.mean()),
                        "image_std": float(image_arr.std()),
                        "image_min": float(image_arr.min()),
                        "image_max": float(image_arr.max()),
                    }
                }
            )
        return resp
    except Exception as e:
        logger.exception("Erro ao gerar caption: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao gerar caption: {str(e)}")


