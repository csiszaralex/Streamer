import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { AppConfigService } from '../configs/app-config.service';
import { VideoService } from './video.service';

// Mocks
jest.mock('fs/promises');
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    createReadStream: jest.fn(),
    statSync: jest.fn(),
  };
});
jest.mock('child_process');

describe('VideoService', () => {
  let service: VideoService;
  let configService: AppConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'VIDEO_ROOT_PATH') return '/mock/root';
      if (key === 'FFMPEG_PATH') return '/usr/bin/ffmpeg';
      if (key === 'FFPROBE_PATH') return '/usr/bin/ffprobe';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoService, { provide: AppConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<VideoService>(VideoService);
    configService = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVideoMetadata', () => {
    it('should return metadata for valid file', async () => {
      const mockSpawn = require('child_process').spawn;
      const mockStdout = new EventEmitter();
      const mockProcess = new EventEmitter();
      (mockProcess as any).stdout = mockStdout;

      mockSpawn.mockReturnValue(mockProcess);

      const mockMeta = {
        format: {
          duration: '100',
          size: '1024',
          format_name: 'mp4',
        },
        streams: [
          { codec_type: 'video', width: 1920, height: 1080, codec_name: 'h264' },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
      };

      // Ensure fs.access resolves happily
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT')); // No sidecar

      const pendingPromise = service.getVideoMetadata('test.mp4');

      // Wait for process spawning (microtasks)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate process output
      mockStdout.emit('data', JSON.stringify(mockMeta));
      mockProcess.emit('close', 0);

      const result = await pendingPromise;

      expect(result).toEqual({
        filename: 'test.mp4',
        duration: 100,
        size: 1024,
        container: 'mp4',
        width: 1920,
        height: 1080,
        videoCodec: 'h264',
        audioCodec: 'aac',
      });
    });

    it('should merge sidecar metadata if present', async () => {
      const mockSpawn = require('child_process').spawn;
      const mockStdout = new EventEmitter();
      const mockProcess = new EventEmitter();
      (mockProcess as any).stdout = mockStdout;
      mockSpawn.mockReturnValue(mockProcess);

      const mockMeta = { format: {}, streams: [] };
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Mock sidecar read
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          displayName: 'My Movie',
          tags: ['Action'],
        }),
      );

      const pendingPromise = service.getVideoMetadata('test.mp4');
      await new Promise((resolve) => setTimeout(resolve, 10));
      mockStdout.emit('data', JSON.stringify(mockMeta));
      mockProcess.emit('close', 0);

      const result = await pendingPromise;
      expect(result.displayName).toBe('My Movie');
      expect(result.tags).toEqual(['Action']);
    });

    it('should throw NotFoundException if file access fails', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      await expect(service.getVideoMetadata('nonexistent.mp4')).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveVideoMetadata', () => {
    it('should save metadata to sidecar file', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT')); // No existing sidecar
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.saveVideoMetadata('test.mp4', { displayName: 'New Name' });

      // Expect writeFile to be called with correct path and content
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.mp4.meta.json'),
        expect.stringContaining('"displayName": "New Name"'),
        'utf-8',
      );
    });
  });

  describe('getAllTags', () => {
    it('should aggregate unique tags from meta files', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'movie1.mp4.meta.json', isFile: () => true, isDirectory: () => false },
        { name: 'movie2.mp4.meta.json', isFile: () => true, isDirectory: () => false },
        { name: 'other.txt', isFile: () => true, isDirectory: () => false },
      ]);

      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('movie1'))
          return Promise.resolve(JSON.stringify({ tags: ['Action', 'Sci-Fi'] }));
        if (path.includes('movie2'))
          return Promise.resolve(JSON.stringify({ tags: ['Comedy', 'Action'] }));
        return Promise.reject(new Error('no meta'));
      });

      const tags = await service.getAllTags();
      expect(tags).toEqual(['Action', 'Comedy', 'Sci-Fi']);
    });
  });

  describe('downloadVideo', () => {
    it('should trigger response download', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined); // File exists
      const res = {
        download: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        headersSent: false,
      } as any;

      await service.downloadVideo('test.mp4', res);
      expect(res.download).toHaveBeenCalledWith(
        expect.stringContaining('test.mp4'),
        'test.mp4',
        expect.any(Function),
      );
    });
  });

  describe('listFolder', () => {
    it('should list files and folders', async () => {
      (fs.stat as unknown as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
      });

      const mockDirents = [
        { name: 'folder1', isDirectory: () => true },
        { name: 'video.mp4', isDirectory: () => false },
        { name: 'ignore.txt', isDirectory: () => false },
      ];

      (fs.readdir as jest.Mock).mockResolvedValue(mockDirents);

      const result = await service.listFolder('');

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].name).toBe('folder1');
      expect(result.entries[1].name).toBe('video.mp4');
    });

    it('should throw BadRequestException if path not a directory', async () => {
      (fs.stat as unknown as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
      });

      await expect(service.listFolder('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if directory does not exist', async () => {
      (fs.stat as unknown as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      await expect(service.listFolder('badpath')).rejects.toThrow(NotFoundException);
    });
  });
});
