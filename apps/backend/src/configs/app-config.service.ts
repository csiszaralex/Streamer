import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.validation';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private configService: ConfigService<EnvConfig, true>) {
    this.logger.log('AppConfigService initialized');
  }

  get<T extends keyof EnvConfig>(key: T): EnvConfig[T] {
    return this.configService.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get port(): number {
    return this.get('PORT');
  }
}
