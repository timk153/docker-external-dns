import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

/**
 * Logger service.
 * Simply extends ConsoleLogger and makes it injectable.
 *
 * Transient to ensure a new instance per injection
 */
@Injectable({ scope: Scope.TRANSIENT })
export class ConsoleLoggerService extends ConsoleLogger {}
