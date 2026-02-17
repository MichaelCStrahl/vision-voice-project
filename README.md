# Vision Voice Project

A mobile application that combines computer vision and voice interaction to help users understand their environment through image analysis and voice commands.

## Overview

Vision Voice is a React Native mobile app that uses voice commands to trigger image analysis features. Users can capture images using their device camera and receive audio descriptions of what they see, either as detailed captions or as detected objects. The app is designed to be accessible, providing both visual and audio feedback.

## Architecture

The project consists of three main components:

1. **Mobile App** (`vision-voice-rn/`): React Native application built with Expo
2. **Object Detection API** (`object-detection-api/`): FastAPI service for object detection
3. **Caption API** (`caption-api/`): FastAPI service for image captioning

## Features

### Voice Commands

The app supports the following voice commands:
- **"Descrever ambiente"** / **"Descrever"**: Generates a detailed caption describing the scene
- **"Identificar objetos"** / **"Identificar"**: Detects and lists objects in the image
- **"Repetir"**: Repeats the last response
- **"Ajuda"**: Provides help information about available commands
- **"Cancelar"**: Cancels the current operation

### Core Functionality

1. **Speech-to-Text**: Records audio and transcribes it using Google Speech-to-Text API
2. **Image Capture**: Takes photos using the device camera
3. **Object Detection**: Identifies objects in images using YOLOv8n model
4. **Image Captioning**: Generates natural language descriptions of images
5. **Text Translation**: Translates model outputs to Portuguese
6. **Text-to-Speech**: Converts results to audio output for accessibility

## Models

### Object Detection Model

- **Model**: YOLOv8n (Ultralytics)
- **Framework**: PyTorch / Ultralytics
- **Purpose**: Detects and classifies objects in images
- **Output**: List of detected objects with class names, confidence scores, and optional bounding boxes
- **Configuration**: Configurable via `config.json` (confidence threshold, IoU threshold, image size, max detections)

The model is loaded from `object-detection-model/best.pt` weights file and uses class labels defined in `labels.json`.

### Image Captioning Model

- **Architecture**: Transformer-based encoder-decoder
- **Image Encoder**: EfficientNetB0 (CNN backbone)
- **Text Encoder**: Transformer encoder with multi-head attention
- **Text Decoder**: Transformer decoder with causal masking and cross-attention
- **Framework**: TensorFlow/Keras
- **Purpose**: Generates natural language captions describing image content
- **Output**: Text caption describing the scene

The captioning model uses:
- EfficientNetB0 as the visual feature extractor
- Transformer encoder to process visual features
- Transformer decoder with positional embeddings to generate captions
- Custom vocabulary and text vectorization for tokenization
- Greedy decoding strategy for inference

Model artifacts include:
- `caption_model.weights.h5`: Trained model weights
- `vocab.json`: Vocabulary mapping
- `metadata.json`: Model configuration (image size, sequence length, embedding dimensions, etc.)

## Application Flow

1. **User Interaction**: User presses and holds the voice command button
2. **Audio Recording**: App records audio while button is pressed
3. **Transcription**: When released, audio is sent to Google Speech-to-Text API
4. **Command Recognition**: Transcribed text is matched against voice command patterns
5. **Image Capture**: If command requires image analysis, a photo is taken
6. **API Request**: Image is sent to the appropriate API (detection or caption)
7. **Processing**: Model processes the image and returns results
8. **Translation**: Results are translated to Portuguese (if needed)
9. **Display & Audio**: Results are displayed on screen and spoken via TTS

## APIs

### Object Detection API

**Base URL**: Configurable via environment variables

**Endpoints**:
- `GET /health`: Health check and model status
- `GET /categories`: List of detectable object classes
- `POST /detect`: Detect objects from uploaded image file
- `POST /detect/base64`: Detect objects from base64-encoded image

**Response Format**:
```json
{
  "success": true,
  "detected_objects": [
    {
      "class": "object_name",
      "confidence": 0.95,
      "class_id": 0
    }
  ],
  "categories": ["class1", "class2", ...],
  "threshold": 0.25
}
```

### Caption API

**Base URL**: Configurable via environment variables

**Endpoints**:
- `GET /health`: Health check and model status
- `POST /caption`: Generate caption from uploaded image file

**Response Format**:
```json
{
  "success": true,
  "caption": "A description of the image"
}
```

## Technology Stack

### Mobile App
- React Native (Expo)
- TypeScript
- Expo Camera, Expo AV, Expo Speech
- Axios for API calls
- React Hooks for state management

### Backend APIs
- FastAPI (Python)
- YOLOv8n (Ultralytics) for object detection
- TensorFlow/Keras for captioning model
- CORS enabled for cross-origin requests

### External Services
- Google Speech-to-Text API (transcription)
- Google Translate API (translation)
- Device TTS (text-to-speech)

## Project Structure

```
vision-voice-project/
├── vision-voice-rn/          # React Native mobile app
│   ├── src/
│   │   ├── app/              # App screens
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service functions
│   │   └── utils/            # Utility functions
│   └── package.json
├── object-detection-api/      # Object detection API
│   ├── main.py               # FastAPI application
│   └── object-detection-model/ # Model files
├── caption-api/              # Caption API
│   ├── main.py               # FastAPI application
│   ├── modeling.py           # Model architecture
│   └── captioning-model/     # Model artifacts
└── README.md                  # This file
```

## Environment Configuration

The mobile app requires environment variables for API endpoints:
- Object Detection API URL
- Caption API URL
- Google Cloud credentials for Speech-to-Text and Translate APIs

The APIs require:
- Model files in their respective model directories
- Python dependencies installed

## Usage

1. Start the mobile app: `cd vision-voice-rn && npm i && npm start`
2. Start the Object Detection API: `cd object-detection-api && python main.py`
3. Start the Caption API: `cd caption-api && python main.py`
4. Configure API URLs in the mobile app environment
5. Grant camera and microphone permissions when prompted
6. Use voice commands to interact with the app

## Notes

- The app is designed with accessibility in mind, providing both visual and audio feedback
- Voice commands are normalized and matched using pattern matching
- Images are processed with configurable quality settings
- Model outputs are filtered by confidence thresholds before display
- The app handles multiple concurrent requests and prevents command conflicts
