# Video Preprocessor Service

Standalone service that runs the first stage of the two-stage video analysis pipeline. It uses ffmpeg/ffprobe to detect candidate highlight windows (scene changes, motion, audio spikes, speech) and returns short clip URLs so Convex sends only those segments to Gemini—reducing timeout risk and cost.

## Requirements

- Node 18+
- ffmpeg and ffprobe on `PATH`

## Setup

```bash
npm install
npm run build
```

## Run

```bash
npm run dev
# or
npm start
```

Listen port: `PORT` (default 3080).

## Endpoints

### POST /candidates

Body:

```json
{
  "videoUrl": "https://...",
  "proxyUrl": "https://... (optional, low-res for preprocessing)",
  "config": {
    "sceneChangeThreshold": 0.4,
    "motionSpikeThreshold": 0.35,
    "audioSpikeThreshold": 0.4,
    "speechEmphasisThreshold": 0.3,
    "maxCandidates": 8,
    "paddingBeforeSeconds": 5,
    "paddingAfterSeconds": 8,
    "targetDurationMinSeconds": 10,
    "targetDurationMaxSeconds": 45,
    "maxClipDurationSeconds": 60
  }
}
```

Response:

```json
{
  "candidates": [
    {
      "startTime": 12.5,
      "endTime": 38.2,
      "duration": 25.7,
      "motionScore": 0.72,
      "audioSpikeScore": 0.45,
      "sceneChangeScore": 0,
      "speechEmphasisScore": 0.6,
      "mergedScore": 0.58,
      "clipUrl": "http://localhost:3080/clip/abc123"
    }
  ],
  "durationSeconds": 120,
  "clipUrls": ["http://localhost:3080/clip/abc123", "..."]
}
```

### GET /clip/:id

Returns the segment video bytes (video/mp4). Clips expire after 5 minutes.

## Environment

- `PORT` – server port (default 3080)
- `PREPROCESSOR_PUBLIC_URL` – public base URL for clip URLs (e.g. `https://preprocessor.example.com`) so Convex can fetch clips

## Convex integration

Set `VIDEO_PREPROCESSOR_URL` in Convex env to this service’s base URL (e.g. `http://localhost:3080` for dev). The Convex action will POST the storage video URL and use returned `clipUrl`s to fetch only segments for Gemini.

## Docker

Build and run:

```bash
npm run build
docker build -t video-preprocessor .
docker run -p 3080:3080 -e PREPROCESSOR_PUBLIC_URL=http://localhost:3080 video-preprocessor
```
