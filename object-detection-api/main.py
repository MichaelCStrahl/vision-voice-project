from __future__ import annotations

import base64
import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import psutil
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    from ultralytics import YOLO
except Exception as e:  # pragma: no cover
    raise RuntimeError(
        "Falha ao importar ultralytics. Verifique se você instalou as dependências "
        "(pip install -r requirements.txt)."
    ) from e


logger = logging.getLogger("object_detection_api")
logging.basicConfig(level=logging.INFO)


class DetectBase64Request(BaseModel):
    image_base64: str = Field(..., description="Base64 puro ou data URL (data:image/...;base64,...)")


class ModelArtifacts(BaseModel):
    model: str = "yolov8n"
    weights_pt: str = "best.pt"
    imgsz: int = 640
    conf: float = 0.25
    iou: float = 0.5
    max_det: int = 100
    return_bboxes: bool = False


APP_DIR = Path(__file__).resolve().parent
MODEL_DIR = APP_DIR / "object-detection-model"

CONFIG_PATH = MODEL_DIR / "config.json"
LABELS_PATH = MODEL_DIR / "labels.json"
WEIGHTS_PATH = MODEL_DIR / "best.pt"


app = FastAPI(title="Object Detection API (YOLOv8n)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_model: Optional[YOLO] = None
_config: Optional[ModelArtifacts] = None
_labels: Optional[List[str]] = None


def _load_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as e:
        raise RuntimeError(f"Arquivo não encontrado: {path}") from e
    except Exception as e:
        raise RuntimeError(f"Falha ao ler JSON: {path}: {e}") from e


def _get_memory_usage() -> Dict[str, float]:
    process = psutil.Process(os.getpid())
    mem = process.memory_info()
    vmem = psutil.virtual_memory()
    return {
        "rss_mb": mem.rss / 1024 / 1024,
        "vms_mb": mem.vms / 1024 / 1024,
        "available_mb": vmem.available / 1024 / 1024,
        "percent": float(process.memory_percent()),
    }


def _ensure_loaded() -> None:
    global _model, _config, _labels
    if _model is not None and _config is not None and _labels is not None:
        return

    if not MODEL_DIR.exists():
        raise RuntimeError(f"Pasta de modelo não encontrada: {MODEL_DIR}")

    cfg_raw = _load_json(CONFIG_PATH)
    labels_raw = _load_json(LABELS_PATH)

    config = ModelArtifacts(**cfg_raw)
    labels = labels_raw.get("classes")
    if not isinstance(labels, list) or not labels:
        raise RuntimeError("labels.json inválido: esperado { classes: [...] }")

    weights_path = MODEL_DIR / config.weights_pt
    if not weights_path.exists():
        raise RuntimeError(f"Pesos não encontrados: {weights_path}")

    logger.info("Carregando modelo YOLO: %s", weights_path)
    _model = YOLO(str(weights_path))
    _config = config
    _labels = [str(x) for x in labels]
    logger.info("Modelo carregado. classes=%d", len(_labels))


def _suffix_from_content_type(content_type: Optional[str]) -> str:
    if not content_type:
        return ".jpg"
    ct = content_type.lower()
    if "png" in ct:
        return ".png"
    if "webp" in ct:
        return ".webp"
    return ".jpg"


def _write_temp_image_bytes(data: bytes, suffix: str) -> Path:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(data)
        tmp.flush()
        return Path(tmp.name)
    finally:
        tmp.close()


def _decode_base64_image(image_base64: str) -> bytes:
    s = image_base64.strip()
    if s.startswith("data:"):
        # data:image/jpeg;base64,....
        try:
            s = s.split("base64,", 1)[1]
        except Exception as e:
            raise HTTPException(status_code=400, detail="Data URL inválida") from e
    try:
        return base64.b64decode(s, validate=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Base64 inválido") from e


def _predict_image_path(image_path: Path, *, conf: float, iou: float, imgsz: int, max_det: int) -> Dict[str, Any]:
    _ensure_loaded()
    assert _model is not None
    assert _config is not None
    assert _labels is not None

    t0 = time.time()
    pred = _model.predict(
        source=str(image_path),
        conf=conf,
        iou=iou,
        imgsz=imgsz,
        max_det=max_det,
        verbose=False,
    )[0]
    dt_ms = (time.time() - t0) * 1000.0

    names = pred.names  # dict[int,str]
    objects: List[Dict[str, Any]] = []

    for b in pred.boxes:
        cls_id = int(b.cls.item())
        score = float(b.conf.item())
        class_name = names.get(cls_id, str(cls_id))
        # Maintain compatibility with the RN app (DetectedObject: {class, confidence, class_id})
        item: Dict[str, Any] = {"class": class_name, "confidence": score, "class_id": cls_id}
        if _config.return_bboxes:
            # xyxy in pixels (float)
            xyxy = b.xyxy.cpu().numpy().reshape(-1).tolist()
            item["bbox_xyxy"] = xyxy
        objects.append(item)

    objects.sort(key=lambda x: x["confidence"], reverse=True)

    # For compatibility with the existing app interface:
    # - success/message
    # - detected_objects
    # - categories (list of classes)
    # - threshold (we use conf as threshold)
    # - all_predictions (does not apply to YOLO; we keep it empty)
    return {
        "success": True,
        "message": f"Detectados {len(objects)} objetos",
        "detected_objects": objects,
        "all_predictions": [],
        "categories": _labels,
        "threshold": conf,
        # Extras useful (not used by the app today)
        "count": len(objects),
        "config": {
            "model": _config.model,
            "imgsz": imgsz,
            "conf": conf,
            "iou": iou,
            "max_det": max_det,
            "return_bboxes": bool(_config.return_bboxes),
        },
        "timing_ms": {"predict": dt_ms},
    }


@app.on_event("startup")
async def startup_event() -> None:
    _ensure_loaded()


@app.get("/")
async def root() -> Dict[str, Any]:
    return {"message": "Object Detection API (YOLOv8n) online", "model_dir": str(MODEL_DIR)}


@app.get("/health")
async def health() -> Dict[str, Any]:
    ok = True
    err: Optional[str] = None
    try:
        _ensure_loaded()
    except Exception as e:
        ok = False
        err = str(e)

    return {
        "status": "healthy" if ok else "error",
        "model_loaded": _model is not None,
        "config_loaded": _config is not None,
        "labels_loaded": _labels is not None,
        "labels_count": len(_labels) if _labels else 0,
        "memory": _get_memory_usage(),
        "error": err,
    }


@app.get("/categories")
async def categories() -> Dict[str, Any]:
    _ensure_loaded()
    assert _labels is not None
    return {"categories": _labels, "count": len(_labels)}


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    conf: Optional[float] = None,
    iou: Optional[float] = None,
    imgsz: Optional[int] = None,
    max_det: Optional[int] = None,
) -> JSONResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")

    _ensure_loaded()
    assert _config is not None

    conf_v = float(conf if conf is not None else _config.conf)
    iou_v = float(iou if iou is not None else _config.iou)
    imgsz_v = int(imgsz if imgsz is not None else _config.imgsz)
    max_det_v = int(max_det if max_det is not None else _config.max_det)

    suffix = _suffix_from_content_type(file.content_type)
    tmp_path: Optional[Path] = None
    try:
        data = await file.read()
        tmp_path = _write_temp_image_bytes(data, suffix=suffix)
        out = _predict_image_path(tmp_path, conf=conf_v, iou=iou_v, imgsz=imgsz_v, max_det=max_det_v)
        return JSONResponse(out)
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass


@app.post("/detect/base64")
async def detect_base64(
    payload: DetectBase64Request,
    conf: Optional[float] = None,
    iou: Optional[float] = None,
    imgsz: Optional[int] = None,
    max_det: Optional[int] = None,
) -> JSONResponse:
    _ensure_loaded()
    assert _config is not None

    conf_v = float(conf if conf is not None else _config.conf)
    iou_v = float(iou if iou is not None else _config.iou)
    imgsz_v = int(imgsz if imgsz is not None else _config.imgsz)
    max_det_v = int(max_det if max_det is not None else _config.max_det)

    tmp_path: Optional[Path] = None
    try:
        data = _decode_base64_image(payload.image_base64)
        tmp_path = _write_temp_image_bytes(data, suffix=".jpg")
        out = _predict_image_path(tmp_path, conf=conf_v, iou=iou_v, imgsz=imgsz_v, max_det=max_det_v)
        return JSONResponse(out)
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass
