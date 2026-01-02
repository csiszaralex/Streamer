# Streamer Backend (NestJS)

This is the "brain" of the system. It is responsible for secure media file access, metadata extraction, and managing video streams.

## 🔑 Core Features

### 1. Secure File System Handling (`resolveSafePath`)
The system is protected against **Path Traversal** attacks. Every incoming path is normalized (`path.normalize`), and verified to ensure the result remains strictly within the defined `VIDEO_ROOT_PATH`.

### 2. Intelligent Streaming (`VideoService`)
The server automatically determines the streaming strategy based on the file extension:

* **Direct Stream (MP4, WebM):**
    * Uses native Node.js `fs.createReadStream`.
    * Supports HTTP Range Requests (byte-based seeking).
    * CPU Load: ~0%.
* **Live Transmuxing (MKV, AVI):**
    * Uses native FFmpeg calls via Node.js `child_process.spawn`.
    * **Does not transcode video** (`-c:v copy`), only swaps the container (MKV -> Fragmented MP4).
    * Supports seeking based on timestamps (`-ss` flag).

### 3. Metadata Extraction
Extracts video technical data (duration, resolution, codecs) in JSON format using `ffprobe`, which the frontend uses to build the UI.

## 🛠 Architecture

* **`app.module.ts`**: Main module, configures `ServeStaticModule` (serving frontend) and `ConfigModule`.
* **`video/`**:
    * `video.controller.ts`: REST API endpoints (`/browse`, `/stream`, `/metadata`).
    * `video.service.ts`: Business logic and FFmpeg/FS integration.
* **`configs/`**: Environment variable validation (using `Zod`).

## 🚀 FFmpeg Parameters Explained

We use the following flags optimized for Raspberry Pi 3B for MKV files:

```bash
ffmpeg -ss [START_TIME] -i [INPUT] \
  -movflags frag_keyframe+empty_moov+default_base_moof \  # Fragmented MP4 (streamable)
  -c:v copy \                                             # Copy video stream (No CPU load)
  -c:a aac \                                              # Audio: AAC Stereo (Fast encoding)
  -f mp4 -                                                # Output: STDOUT Pipe
```

## 📝 API Endpoints

* `GET /api/videos/browse?path=Folder`: Lists folder content.
* `GET /api/videos/metadata?path=Movie.mkv`: Retrieves video technical metadata.
* `GET /api/videos/stream?path=Movie.mkv&start=120`: Starts video stream (optionally from a specific start time).
