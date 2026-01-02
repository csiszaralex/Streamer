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
};
