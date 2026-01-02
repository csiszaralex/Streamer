import { Module } from '@nestjs/common';
import { AppConfigModule } from './configs/app-config.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [AppConfigModule, VideoModule],
})
export class AppModule {}
