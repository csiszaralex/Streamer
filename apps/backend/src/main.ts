import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './configs/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('START');
  const configService = app.get(AppConfigService);
  const port = configService.port;

  await app.listen(port);
  logger.debug(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
