import { Module } from '@nestjs/common';
import { AppConfigModule } from './configs/app-config.module';
import { VideoModule } from './video/video.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    AppConfigModule,
    VideoModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/(.*)'],
    }),
  ],
})
export class AppModule {}
