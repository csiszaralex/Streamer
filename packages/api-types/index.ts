export interface FileEntry {
  name: string;
  type: 'file' | 'folder';
  path: string; // Ez a relatív útvonal a gyökértől (pl. "Movies/Avatar.mkv")
  size?: number; // Fájlméret bájtban (csak fájloknál)
  displayName?: string;
  tags?: string[];
}

export interface FolderContent {
  path: string; // Jelenlegi mappa útvonala
  parent?: string; // Szülő mappa útvonala (navigációhoz)
  entries: FileEntry[];
}
export interface VideoMetadata extends FFMPEGMetadata, CustomMetadata {}

export interface FFMPEGMetadata {
  filename: string;
  duration: number; // másodpercben
  size: number; // bájtban
  width: number; // pl. 1920
  height: number; // pl. 1080
  videoCodec: string; // pl. h264, hevc, vp9
  audioCodec: string; // pl. aac, ac3, mp3
  container: string; // pl. mov,mp4,m4a,3gp,3g2,mj2
}

export interface CustomMetadata {
  displayName?: string;
  description?: string;
  year?: number;
  tags?: string[];
}
