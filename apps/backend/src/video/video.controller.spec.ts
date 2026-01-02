import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

describe('VideoController', () => {
  let controller: VideoController;
  let service: VideoService;

  const mockVideoService = {
    listFolder: jest.fn(),
    streamVideo: jest.fn(),
    getVideoMetadata: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [{ provide: VideoService, useValue: mockVideoService }],
    }).compile();

    controller = module.get<VideoController>(VideoController);
    service = module.get<VideoService>(VideoService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('browse', () => {
    it('should call service.listFolder', async () => {
      const path = 'some/path';
      await controller.browse(path);
      expect(service.listFolder).toHaveBeenCalledWith(path);
    });

    it('should call service.listFolder with empty string if undefined', async () => {
      await controller.browse(undefined as any);
      expect(service.listFolder).toHaveBeenCalledWith('');
    });
  });

  describe('stream', () => {
    it('should call service.streamVideo', async () => {
      const path = 'video.mp4';
      const start = '0';
      const range = 'bytes=0-';
      const res = {} as Response;
      const req = { headers: { range } } as Request;

      await controller.stream(path, start, res, req);
      expect(service.streamVideo).toHaveBeenCalledWith(path, range, start, res);
    });
  });

  describe('getMetadata', () => {
    it('should call service.getVideoMetadata', async () => {
      const path = 'video.mp4';
      await controller.getMetadata(path);
      expect(service.getVideoMetadata).toHaveBeenCalledWith(path);
    });

    it('should throw BadRequestException if path is missing', async () => {
      await expect(controller.getMetadata('')).rejects.toThrow(BadRequestException);
    });
  });
});
