# Caption API

FastAPI service for generating natural language image captions using a Transformer-based model.

## Model

### Transformer-Based Image Captioning Model

**Framework**: TensorFlow/Keras

**Architecture**:

1. **Image Encoder**:
   - **Backbone**: EfficientNetB0 (CNN)
   - Extracts visual features from input images
   - Output: Feature maps reshaped into sequence format
   - Pre-trained on ImageNet (weights loaded from training)

2. **Transformer Encoder**:
   - Multi-head self-attention mechanism
   - Processes visual features from CNN
   - Learns spatial relationships in the image
   - Configurable number of attention heads (default: 2)

3. **Transformer Decoder**:
   - Causal self-attention (prevents looking at future tokens)
   - Cross-attention to image features
   - Feed-forward network layers
   - Positional embeddings for token sequences
   - Configurable number of attention heads (default: 3)
   - Output: Probability distribution over vocabulary

**Inference Strategy**: Greedy decoding
- Generates captions token by token
- At each step, selects the token with highest probability
- Stops when `<end>` token is generated or max sequence length reached

**Model Artifacts**:
- `caption_model.weights.h5`: Trained model weights
- `vocab.json`: Vocabulary mapping (word → token ID)
- `metadata.json`: Model configuration and hyperparameters

**Default Configuration** (from metadata.json):
- Image size: (224, 224) or (299, 299) pixels
- Sequence length: Maximum caption length
- Vocabulary size: Number of unique tokens
- Embedding dimension: Token embedding size
- Feed-forward dimension: Transformer FFN size
- Encoder attention heads: 2
- Decoder attention heads: 3

**Output Format**:
- Natural language caption describing the image content
- Text string without special tokens (`<start>`, `<end>`)

## API Endpoints

### GET `/`
Health check endpoint.

**Response**:
```json
{
  "message": "Captioning API está funcionando!",
  "status": "online"
}
```

### GET `/health`
Detailed health check with model status and artifact verification.

**Response**:
```json
{
  "status": "ok",
  "artifacts_dir": "captioning-model",
  "weights_path": "captioning-model/caption_model.weights.h5",
  "vocab_path": "captioning-model/vocab.json",
  "metadata_path": "captioning-model/metadata.json",
  "sha256": {
    "weights": "abc123...",
    "vocab": "def456...",
    "metadata": "ghi789..."
  },
  "runtime": {
    "tensorflow": "2.18.0",
    "keras": "2.18.0",
    "TF_ENABLE_ONEDNN_OPTS": null
  }
}
```

### POST `/caption`
Generates caption for uploaded image file.

**Parameters**:
- `file` (multipart/form-data): Image file
- `debug` (optional, boolean): Include debug information in response

**Response** (normal):
```json
{
  "success": true,
  "caption": "a person riding a bicycle on a street"
}
```

**Response** (with debug=true):
```json
{
  "success": true,
  "caption": "a person riding a bicycle on a street",
  "debug": {
    "sha256": "abc123...",
    "bytes": 45678,
    "image_mean": 0.45,
    "image_std": 0.25,
    "image_min": 0.0,
    "image_max": 1.0
  }
}
```

## How It Works

1. **Model Loading**: On startup, the API:
   - Loads vocabulary from `vocab.json`
   - Reads metadata from `metadata.json`
   - Builds model architecture matching training configuration
   - Loads trained weights from `caption_model.weights.h5`
   - Computes SHA256 hashes of artifacts for verification

2. **Image Preprocessing**:
   - Decodes image bytes (JPEG, PNG, etc.)
   - Resizes to configured image size
   - Normalizes pixel values to [0, 1] range
   - Converts to float32 format

3. **Feature Extraction**:
   - Passes image through EfficientNetB0 CNN
   - Extracts visual feature maps
   - Reshapes features into sequence format

4. **Encoding**:
   - Processes visual features through Transformer encoder
   - Applies self-attention to learn spatial relationships

5. **Caption Generation** (Greedy Decoding):
   - Starts with `<start>` token
   - For each position:
     - Tokenizes current caption sequence
     - Passes through Transformer decoder
     - Applies cross-attention to encoded image features
     - Predicts next token probability distribution
     - Selects token with highest probability
   - Stops when `<end>` token is generated or max length reached

6. **Post-processing**:
   - Removes `<start>` and `<end>` tokens
   - Returns clean caption text

## Model Architecture Details

### EfficientNetB0 Backbone
- Input: RGB image (224x224 or 299x299)
- Output: Feature maps (flattened to sequence)
- Pre-trained weights loaded from training

### Transformer Encoder Block
- Multi-head self-attention
- Layer normalization
- Feed-forward network
- Residual connections

### Transformer Decoder Block
- Causal self-attention (masked)
- Cross-attention to image features
- Feed-forward network with dropout
- Layer normalization
- Residual connections
- Output projection to vocabulary size

### Text Vectorization
- Custom standardization (removes punctuation, lowercase)
- Vocabulary-based tokenization
- Sequence padding/truncation

## Dependencies

- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `tensorflow`: Deep learning framework
- `keras`: High-level neural network API
- `numpy`: Numerical operations
- `pillow`: Image processing
- `python-multipart`: File upload support
- `psutil`: System monitoring

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Place model artifacts in `captioning-model/` directory:
   - `caption_model.weights.h5`: Model weights
   - `vocab.json`: Vocabulary file
   - `metadata.json`: Model metadata

3. (Optional) Set environment variables:
```bash
export CAPTIONING_ARTIFACTS_DIR="captioning-model"
export CAPTIONING_WEIGHTS_PATH="captioning-model/caption_model.weights.h5"
export CAPTIONING_VOCAB_PATH="captioning-model/vocab.json"
export CAPTIONING_METADATA_PATH="captioning-model/metadata.json"
```

4. Run the API:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Model Directory Structure

```
caption-api/
├── main.py
├── modeling.py
├── requirements.txt
└── captioning-model/
    ├── caption_model.weights.h5
    ├── vocab.json
    └── metadata.json
```

## Metadata File Format

`metadata.json`:
```json
{
  "image_size": [224, 224],
  "seq_length": 20,
  "vocab_size": 5000,
  "embed_dim": 256,
  "ff_dim": 512,
  "encoder_num_heads": 2,
  "decoder_num_heads": 3,
  "strip_chars": "!\"#$%&'()*+,-./:;=?@[\\]^_`{|}~1234567890"
}
```

## Vocabulary File Format

`vocab.json`:
```json
[
  "",
  "[UNK]",
  "<start>",
  "<end>",
  "a",
  "the",
  "person",
  ...
]
```

## Performance

- **Inference Speed**: ~200-500ms per image (on CPU, depends on caption length)
- **Memory Usage**: ~1-2GB (model + runtime)
- **Model Size**: Varies based on training configuration
- **Caption Quality**: Depends on training data and model configuration

## Configuration

The model runs on CPU by default (GPU disabled for stability in Docker environments). TensorFlow determinism is enabled to reduce variation across runs.

---

## ⚠️ OBS: Security Notice

**This API implementation is intended for testing and development purposes only.**

For production use, it is recommended to implement a more robust API with enhanced security measures, including:

- **Authentication & Authorization**: API keys, JWT tokens, or OAuth2
- **Rate Limiting**: Prevent abuse and ensure fair resource usage
- **Input Validation**: Strict validation of image formats, sizes, and content
- **File Size Limits**: Maximum file size restrictions (images can be large)
- **Request Timeout**: Timeout handling for inference operations
- **Error Handling**: Comprehensive error handling without exposing internal details
- **Logging & Monitoring**: Proper logging and monitoring for production environments
- **HTTPS**: Encrypted communication
- **CORS Configuration**: Restrict CORS to specific origins instead of allowing all (`*`)
- **Resource Limits**: Memory and CPU usage limits (TensorFlow models can be memory-intensive)
- **DDoS Protection**: Protection against denial-of-service attacks
- **Model Versioning**: Version control for model artifacts
- **Health Checks**: Comprehensive health check endpoints for monitoring

The current implementation uses permissive CORS (`allow_origins=["*"]`) and lacks authentication, making it unsuitable for production environments without additional security layers. Additionally, TensorFlow models can consume significant memory, so proper resource management is crucial.
