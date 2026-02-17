# Object Detection API

FastAPI service for object detection using YOLOv8n model.

## Model

### YOLOv8n (You Only Look Once version 8 nano)

**Framework**: Ultralytics YOLO (PyTorch-based)

**Architecture**: 
- YOLOv8n is the nano variant of YOLOv8, optimized for speed and efficiency
- Single-stage object detector that predicts bounding boxes and class probabilities in one pass
- Uses CSPDarknet backbone with PANet neck and YOLOv8 head

**Model Files**:
- `best.pt`: Trained model weights (PyTorch format)
- `config.json`: Model configuration (confidence threshold, IoU threshold, image size, etc.)
- `labels.json`: Class labels mapping (list of detectable object classes)

**Default Configuration**:
- Image size: 640x640 pixels
- Confidence threshold: 0.25
- IoU threshold: 0.5 (for Non-Maximum Suppression)
- Max detections: 100 objects per image
- Bounding boxes: Optional (disabled by default)

**Output Format**:
- Detected objects with class name, confidence score, and class ID
- Optional bounding box coordinates (x1, y1, x2, y2) in pixel coordinates
- Results sorted by confidence score (highest first)

## API Endpoints

### GET `/`
Health check endpoint.

**Response**:
```json
{
  "message": "Object Detection API (YOLOv8n) online",
  "model_dir": "/path/to/model"
}
```

### GET `/health`
Detailed health check with model status and memory usage.

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "config_loaded": true,
  "labels_loaded": true,
  "labels_count": 80,
  "memory": {
    "rss_mb": 512.5,
    "vms_mb": 1024.0,
    "available_mb": 2048.0,
    "percent": 25.0
  },
  "error": null
}
```

### GET `/categories`
Returns list of detectable object classes.

**Response**:
```json
{
  "categories": ["person", "car", "bicycle", ...],
  "count": 80
}
```

### POST `/detect`
Detects objects in uploaded image file.

**Parameters**:
- `file` (multipart/form-data): Image file
- `conf` (optional, float): Confidence threshold (default: from config)
- `iou` (optional, float): IoU threshold (default: from config)
- `imgsz` (optional, int): Image size for inference (default: from config)
- `max_det` (optional, int): Maximum detections (default: from config)

**Response**:
```json
{
  "success": true,
  "message": "Detectados 5 objetos",
  "detected_objects": [
    {
      "class": "person",
      "confidence": 0.95,
      "class_id": 0
    },
    {
      "class": "car",
      "confidence": 0.87,
      "class_id": 2
    }
  ],
  "categories": ["person", "car", ...],
  "threshold": 0.25,
  "count": 5,
  "config": {
    "model": "yolov8n",
    "imgsz": 640,
    "conf": 0.25,
    "iou": 0.5,
    "max_det": 100
  },
  "timing_ms": {
    "predict": 45.2
  }
}
```

### POST `/detect/base64`
Detects objects in base64-encoded image.

**Request Body**:
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Parameters**: Same as `/detect` endpoint (conf, iou, imgsz, max_det)

**Response**: Same format as `/detect` endpoint

## How It Works

1. **Model Loading**: On startup, the API loads the YOLOv8n model from `best.pt` weights file
2. **Configuration**: Reads model configuration from `config.json` and class labels from `labels.json`
3. **Image Processing**: 
   - Accepts image file or base64-encoded image
   - Decodes and saves temporarily
   - Resizes to configured image size (default: 640x640)
4. **Inference**: 
   - Runs YOLOv8n prediction
   - Applies confidence threshold filtering
   - Performs Non-Maximum Suppression (NMS) using IoU threshold
   - Limits to max_det detections
5. **Response**: Returns detected objects with metadata and timing information

## Dependencies

- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `ultralytics`: YOLOv8 implementation
- `opencv-python-headless`: Image processing
- `numpy`: Numerical operations
- `psutil`: System monitoring
- `pillow`: Image handling
- `python-multipart`: File upload support

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Place model files in `object-detection-model/` directory:
   - `best.pt`: Model weights
   - `config.json`: Configuration file
   - `labels.json`: Class labels

3. Run the API:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Model Directory Structure

```
object-detection-api/
├── main.py
├── requirements.txt
└── object-detection-model/
    ├── best.pt
    ├── config.json
    └── labels.json
```

## Configuration File Format

`config.json`:
```json
{
  "model": "yolov8n",
  "weights_pt": "best.pt",
  "imgsz": 640,
  "conf": 0.25,
  "iou": 0.5,
  "max_det": 100,
  "return_bboxes": false
}
```

## Labels File Format

`labels.json`:
```json
{
  "classes": [
    "person",
    "bicycle",
    "car",
    ...
  ]
}
```

## Performance

- **Inference Speed**: ~40-50ms per image (on CPU, 640x640 input)
- **Memory Usage**: ~500-600MB (model + runtime)
- **Model Size**: ~6MB (YOLOv8n weights)

---

## ⚠️ OBS: Security Notice

**This API implementation is intended for testing and development purposes only.**

For production use, it is recommended to implement a more robust API with enhanced security measures, including:

- **Authentication & Authorization**: API keys, JWT tokens, or OAuth2
- **Rate Limiting**: Prevent abuse and ensure fair resource usage
- **Input Validation**: Strict validation of image formats, sizes, and content
- **File Size Limits**: Maximum file size restrictions
- **Request Timeout**: Timeout handling for long-running requests
- **Error Handling**: Comprehensive error handling without exposing internal details
- **Logging & Monitoring**: Proper logging and monitoring for production environments
- **HTTPS**: Encrypted communication
- **CORS Configuration**: Restrict CORS to specific origins instead of allowing all (`*`)
- **Resource Limits**: Memory and CPU usage limits
- **DDoS Protection**: Protection against denial-of-service attacks

The current implementation uses permissive CORS (`allow_origins=["*"]`) and lacks authentication, making it unsuitable for production environments without additional security layers.
