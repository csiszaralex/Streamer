import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppConfigModule } from './configs/app-config.module';
import { TorrentModule } from './torrent/torrent.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    AppConfigModule,
    VideoModule,
    TorrentModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/:path*'],
    }),
  ],
})
export class AppModule {}
