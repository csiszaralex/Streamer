import type { FolderContent, VideoMetadata } from '@stream/api-types';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/videos',
});

export const videoApi = {
  listFolder: async (path: string = '') => {
    const { data } = await apiClient.get<FolderContent>(`/browse?path=${encodeURIComponent(path)}`);
    return data;
  },

  getMetadata: async (path: string) => {
    const { data } = await apiClient.get<VideoMetadata>(
      `/metadata?path=${encodeURIComponent(path)}`,
    );
    return data;
  },

  uploadTorrent: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post('/api/torrents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};
