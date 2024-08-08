import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Logger service.
 * Simply extends ConsoleLogger and makes it injectable.
 *
 * Transient to ensure a new instance per injection
 */
@Injectable({ scope: Scope.TRANSIENT })
export class ConsoleLoggerService extends ConsoleLogger {
  constructor(private configService: ConfigService) {
    super();
    const logLevel = this.configService.get('LOG_LEVEL');
    if (logLevel === undefined)
      throw new Error(
        'ConsoleLoggerService, constructor: Unreachable exception, LOG_LEVEL is undefined. This should never happen!',
      );
    this.setLogLevels([logLevel]);
  }
}
