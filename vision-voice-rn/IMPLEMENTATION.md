# Implementation Guide - Vision Voice RN

This document describes the implementation details of the Vision Voice React Native mobile application.

## Project Structure

```
vision-voice-rn/
├── src/
│   ├── app/                    # Expo Router screens
│   │   ├── _layout.tsx         # Root layout component
│   │   ├── index.tsx           # Main home screen
│   │   └── +not-found.tsx     # 404 screen
│   ├── components/             # React components
│   │   ├── actions.tsx         # Main action handler component
│   │   ├── audio-visualizer.tsx
│   │   ├── help-button.tsx
│   │   ├── loading.tsx
│   │   ├── permissions-gate.tsx
│   │   ├── result-card.tsx
│   │   ├── voice-command-actions.tsx
│   │   └── voice-command-button.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-caption.ts      # Caption generation hook
│   │   ├── use-detection.ts    # Object detection hook
│   │   ├── use-speech-to-text.ts
│   │   └── use-tts.ts          # Text-to-speech hook
│   ├── services/               # API service functions
│   │   ├── get-caption.ts
│   │   ├── get-objects.ts
│   │   ├── transcribe-text.ts
│   │   └── translate-text.ts
│   ├── utils/                  # Utility functions
│   │   ├── convert-audio-file-to-base64.ts
│   │   ├── decode-html-entities.ts
│   │   ├── get-base-url.ts
│   │   ├── get-encoding-by-audio-format.ts
│   │   ├── intercept-voice-command.ts
│   │   ├── includes-normalized.ts
│   │   └── normalize-text.ts
│   ├── @types/                 # TypeScript type definitions
│   ├── api.ts                  # Axios API client configuration
│   ├── constants.ts            # App constants
│   ├── env.ts                  # Environment variables validation
│   └── theme.ts                # Design system theme
├── app.json                    # Expo configuration
├── package.json
└── tsconfig.json
```

## Architecture Overview

The app follows a component-based architecture with clear separation of concerns:

- **Screens** (`app/`): Expo Router file-based routing
- **Components** (`components/`): Reusable UI components
- **Hooks** (`hooks/`): Custom React hooks for business logic
- **Services** (`services/`): API communication layer
- **Utils** (`utils/`): Pure utility functions

## Core Components

### Actions Component (`components/actions.tsx`)

The main orchestrator component that handles:
- Voice command processing
- Image capture coordination
- API calls to detection and caption services
- State management for results
- Text-to-speech output
- User feedback (haptics, visual feedback)

**Key Responsibilities:**
- Manages the complete flow from voice command to result display
- Coordinates between camera, speech-to-text, APIs, and TTS
- Handles error states and loading states
- Stores last result for "repeat" functionality

### Permissions Gate (`components/permissions-gate.tsx`)

Handles camera and microphone permissions:
- Checks permission status on mount
- Requests permissions when needed
- Shows permission request UI
- Redirects to settings if permissions are denied

### Voice Command Actions (`components/voice-command-actions.tsx`)

UI component for voice interaction:
- Displays recording button with visual states
- Shows audio visualizer during recording
- Displays processing/transcribing status
- Handles press-in/press-out events for recording

## Custom Hooks

### useSpeechToText

Manages audio recording and transcription:
- **States**: `idle`, `starting`, `recording`, `stopping`, `transcribing`
- Records audio using Expo AV
- Converts audio to base64
- Sends to Google Speech-to-Text API
- Handles cleanup and error states
- Prevents race conditions with refs

**Key Features:**
- Phase-based state management with refs for consistency
- Automatic cleanup on unmount
- Retry logic for stop/unload operations
- Audio format detection

### useCaption

Manages image caption generation:
- Takes image URI
- Sends to caption API
- Translates result to Portuguese
- Handles loading and error states
- Request cancellation support

### useDetection

Manages object detection:
- Takes image URI
- Sends to object detection API
- Translates detected object names
- Filters by confidence threshold (≥50%)
- Handles loading and error states
- Request cancellation support

### useTTS

Manages text-to-speech output:
- Uses Expo Speech API
- Configurable language, rate, pitch
- Interrupt support for new speech
- Tracks speaking state
- Default: Portuguese (pt-BR), rate 1.0, pitch 1.0

## Services Layer

### API Client (`api.ts`)

Centralized Axios configuration:
- Dynamic base URL selection based on service type
- Error interceptors for debugging
- Configurable timeout (15 seconds default)
- Service flags: `isDetection`, `isCaption`, `isTranscription`, `isTranslation`

### Service Functions

**get-caption.ts**: Sends image to caption API endpoint
- Accepts image URI
- Creates FormData with image file
- Returns caption text

**get-objects.ts**: Sends image to object detection API
- Accepts image URI
- Creates FormData with image file
- Returns array of detected objects

**transcribe-text.ts**: Google Speech-to-Text integration
- Accepts base64 audio and encoding
- Configures for Portuguese (pt-BR)
- Uses `latest_long` model
- Returns transcribed text

**translate-text.ts**: Google Translate integration
- Translates text to Portuguese (pt-BR)
- Decodes HTML entities in response
- Returns translated text

## Voice Command System

### Command Recognition (`utils/intercept-voice-command.ts`)

Pattern matching system for voice commands:
- Normalizes input text (removes diacritics, lowercase, removes punctuation)
- Matches against predefined command candidates
- Returns command type: `caption`, `detection`, `help`, `repeat`, `unknown`

**Command Patterns** (`constants.ts`):
- **Caption**: "descrever", "descrever ambiente", "descreva a cena"
- **Detection**: "identificar objetos", "detectar objetos", "o que tem aqui"
- **Help**: "ajuda", "o que posso falar", "como usar"
- **Repeat**: "repita", "repetir", "fale novamente"

### Text Normalization (`utils/normalize-text.ts`)

Normalizes text for command matching:
- Removes diacritics (NFD normalization)
- Converts to lowercase
- Removes special characters and punctuation
- Normalizes whitespace
- Trims result

## State Management

The app uses React hooks for state management:
- **Local State**: `useState` for component-specific state
- **Refs**: `useRef` for values that don't trigger re-renders (phase tracking, request IDs)
- **Effects**: `useEffect` for side effects (permissions, cleanup)
- **Callbacks**: `useCallback` for memoized functions

**State Flow Example** (Voice Command):
1. User presses button → `startRecording()` called
2. Phase changes: `idle` → `starting` → `recording`
3. User releases → `stopRecording()` called
4. Phase changes: `recording` → `stopping` → `transcribing`
5. Audio transcribed → `handleVoiceCommand()` called
6. Command matched → appropriate handler executed
7. Image captured → API called → Result displayed and spoken

## API Integration

### Environment Variables (`env.ts`)

Required environment variables (validated with Zod):
- `EXPO_PUBLIC_API_DETECTION_URL`: Object detection API URL
- `EXPO_PUBLIC_API_CAPTION_URL`: Caption API URL
- `EXPO_PUBLIC_API_TRANSCRIPTION_URL`: Google Speech-to-Text API URL
- `EXPO_PUBLIC_API_TRANSCRIPTION_KEY`: Google API key for transcription
- `EXPO_PUBLIC_API_TRANSLATION_URL`: Google Translate API URL
- `EXPO_PUBLIC_API_TRANSLATION_KEY`: Google API key for translation

### Base URL Resolution (`utils/get-base-url.ts`)

Dynamically selects API base URL based on service flags:
- Detection → `EXPO_PUBLIC_API_DETECTION_URL`
- Caption → `EXPO_PUBLIC_API_CAPTION_URL`
- Transcription → `EXPO_PUBLIC_API_TRANSCRIPTION_URL`
- Translation → `EXPO_PUBLIC_API_TRANSLATION_URL`

## Design System

### Theme (`theme.ts`)

Centralized design tokens:
- **Colors**: Gray, blue, green, red, amber palettes
- **Spacing**: Consistent spacing scale (xs to 9xl)
- **Typography**: Font sizes, weights, line heights
- **Sizes**: Component sizing scale
- **Radii**: Border radius values
- **Shadows**: Platform-specific shadow definitions
- **Opacity**: Standard opacity values

### Styling Approach

- StyleSheet API for performance
- Theme tokens for consistency
- Component-level styles
- Accessibility props (accessibilityLabel, accessibilityRole, accessibilityLiveRegion)

## Expo Configuration

### App Configuration (`app.json`)

- **Platforms**: iOS, Android, Web
- **Permissions**: Camera and microphone
- **Orientation**: Portrait only
- **New Architecture**: Enabled
- **Plugins**: expo-router, expo-camera
- **Features**: Typed routes enabled

## Key Implementation Patterns

### Request Cancellation

Uses request ID refs to cancel outdated requests:
```typescript
const requestIdRef = useRef(0)
const requestId = ++requestIdRef.current
// ... API call
if (requestId !== requestIdRef.current) return // Cancel if outdated
```

### Phase Management

Uses refs for phase tracking to prevent race conditions:
```typescript
const phaseRef = useRef<Phase>('idle')
const setPhaseSafe = (next: Phase) => {
  phaseRef.current = next
  setPhase(next)
}
```

### Error Handling

- Try-catch blocks around async operations
- User-friendly error messages
- Console logging for debugging
- Alert dialogs for critical errors

### Accessibility

- Semantic HTML roles (`accessibilityRole`)
- Live regions for dynamic content (`accessibilityLiveRegion`)
- Labels for screen readers (`accessibilityLabel`)
- Hints for user actions (`accessibilityHint`)

## Dependencies

### Core
- **React Native**: 0.81.5
- **Expo**: ~54.0.33
- **Expo Router**: ~6.0.23 (file-based routing)

### Key Libraries
- **expo-camera**: Camera access
- **expo-av**: Audio recording
- **expo-speech**: Text-to-speech
- **axios**: HTTP client
- **zod**: Environment validation
- **lucide-react-native**: Icons

## Development Workflow

1. **Environment Setup**: Configure `.env` with API URLs and keys
2. **Install Dependencies**: `npm install`
3. **Start Development**: `npm start` or `expo start`
4. **Run on Device**: `npm run ios` or `npm run android`

## Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting (Rocketseat config)
- **Type Definitions**: Custom types in `@types/` directory
- **Error Handling**: Comprehensive error handling throughout
- **Code Organization**: Clear separation of concerns
