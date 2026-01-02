# Streamer Monorepo 🎥

This is a custom-built, lightweight self-hosted video streaming server (VOD), specifically optimized for low-resource hardware and modern web standards.

The system is capable of browsing folders, natively streaming MP4 files, and performing **real-time remuxing (transmuxing)** for MKV files to make them compatible with browsers.

## 🏗 Architecture

The project utilizes a **Turborepo** based Monorepo structure.

- **`apps/backend`**: NestJS-based server. Handles file system access, security, and FFmpeg processes.
- **`apps/frontend`**: React (Vite) based SPA. Modern, responsive UI for browsing and playback.
- **`packages/api-types`**: Shared TypeScript interfaces (Shared DTOs) to ensure type safety between the frontend and backend.

## 🚀 Installation & Running

### Prerequisites
- **Node.js** (v18+)
- **pnpm** (`npm i -g pnpm`)
- **FFmpeg** installed on the system (Windows: in PATH, Linux: `apt install ffmpeg`)

### Development Environment (Dev Mode)
Starts the Backend (Port: 3000) and Frontend (Port: 5173) in parallel. The Vite Proxy handles request forwarding.

```bash
# Install dependencies
pnpm install

# Start (Backend + Frontend in watch mode)
pnpm dev
```

### Production Build
The frontend is compiled into static files (`dist`), which are then copied into the backend's `client` folder. The result is a single executable Node.js process.

```bash
# Build (NestJS build + React build + Copy script)
pnpm build:prod

# Start (Runs only the Backend, which serves the Frontend as well)
pnpm start:prod
```

## ⚙️ Configuration (.env)

Create an `.env` file in the `apps/backend` folder (or in the root for production start):

```env
NODE_ENV=development
PORT=3000
VIDEO_ROOT_PATH=C:/Users/Media/Movies  # Or on Linux: /mnt/usb/movies
FFMPEG_PATH=ffmpeg
```

## 🛠 Tech Stack
- **Backend:** NestJS, Express, Child Process (Native FFmpeg), Zod (Validation)
- **Frontend:** React, Vite, TypeScript, TanStack Query, React Router, TailwindCSS, shadcn/ui
- **Build System:** Turborepo, pnpm workspaces, shx
