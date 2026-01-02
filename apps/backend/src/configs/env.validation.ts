import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  VIDEO_ROOT_PATH: z.string().min(1, 'VIDEO_ROOT_PATH is required'),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validate = (config: Record<string, unknown>) => {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error(
      '❌ Invalid environment variables:',
      z.treeifyError(result.error),
    );
    throw new Error('Invalid environment variables');
  }
  return result.data;
};
