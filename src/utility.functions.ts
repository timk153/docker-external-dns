import { ConsoleLogger, LoggerService } from '@nestjs/common';
import { Decorator } from 'logger-decorator';

/**
 * https://www.npmjs.com/package/logger-decorator#usage
 *
 * Configures the logger-decorator for class level trace logging
 * @param {() => LoggerService} logger The logger to be used to output the logs
 */
export function getLogClassDecorator(getLogger?: () => LoggerService) {
  const logger = new ConsoleLogger();

  return new Decorator({
    level: 'trace',
    logger: (logLevel, data) => {
      switch (logLevel) {
        case 'trace':
          (getLogger?.() ?? logger).verbose?.(data);
          return;
        case 'debug':
          (getLogger?.() ?? logger).debug?.(data);
          return;
        case 'info':
          (getLogger?.() ?? logger).log(data);
          return;
        case 'warn':
          (getLogger?.() ?? logger).warn(data);
          return;
        case 'error':
        default:
          (getLogger?.() ?? logger).error(data);
      }
    },
    keepReflectMetadata: ['method', 'path'],
  });
}
