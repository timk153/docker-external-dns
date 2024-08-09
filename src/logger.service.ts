import { ConsoleLogger, Injectable, Scope, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TypeGuard to determine if the string if a LogLevel
 * @param {string} entry string to check if it's a LogLevel
 * @returns true if string if LogLevel else false
 */
const logLevelNames = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'];
export function isLogLevel(entry: string): entry is LogLevel {
  return logLevelNames.includes(entry);
}

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
    let logLevel = this.configService.get('LOG_LEVEL');
    if (logLevel === undefined)
      throw new Error(
        'ConsoleLoggerService, constructor: Unreachable exception, LOG_LEVEL is undefined. This should never happen!',
      );
    if (!isLogLevel(logLevel)) logLevel = 'error';
    this.setLogLevels([logLevel]);
  }
}
