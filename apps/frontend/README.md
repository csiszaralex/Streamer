# Streamer Frontend (React + Vite)

The user interface providing a modern SPA experience for browsing and playing videos. The design follows a dark, minimalist **Netflix-like** style.

## 🎨 Tech Stack & UI Library

* **Framework:** React 18 + Vite (Fast HMR and build).
* **Styling:** TailwindCSS.
* **State Management:** `@tanstack/react-query` (Server state caching, loading states).
* **Routing:** `react-router-dom`.

## 🖥 Key Components

### 1. `FolderBrowser.tsx`
* Recursive file browser.
* Handles navigation breadcrumbs.
* Visually distinguishes between folders and files.
* Automatically caches folder contents for fast navigation.

### 2. `VideoPlayer.tsx` (The playback engine)
This component bridges the gap between the browser and MKV streaming.

* **Custom UI:** Custom control bar (Play, Volume, Fullscreen, Seekbar) hiding the native browser player.
* **Smart Seeking (Offset Logic):**
    * For MKV, the browser sees a "live" stream (native seeking doesn't work).
    * The component manages a `seekOffset` state.
    * On seek (`User Interaction`), it reloads the video source with a new start parameter requested from the backend (`?start=XXXX`).
    * It adds the offset to the video's current time on the UI slider, making the operation transparent to the user.
* **Buffered Visualizer:** Displays the buffered range on the slider, accounting for the transcoding offset.
* **Volume Manager:** Intelligent mute/unmute logic.

## 🔧 Development (Proxy Setup)

During development (`pnpm dev`), the Frontend runs on port `5173`, while the Backend runs on `3000`.
The **Proxy** configured in `vite.config.ts` ensures that `/api` requests are forwarded, allowing the code to use relative paths (`/api/videos/...`), which works seamlessly in production (where they run on the same port).

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```
