import { Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import { NestedError } from '../errors/nested-error';
import { getLogClassDecorator } from '../utility.functions';
import { ConsoleLoggerService } from '../logger.service';

let loggerPointer: ConsoleLoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

@LogDecorator()
@Injectable()
export class DockerFactory {
  private docker: Docker;

  constructor(private loggerService: ConsoleLoggerService) {
    loggerPointer = this.loggerService;
  }

  /**
   * Initializes Docker as a singleton.
   * Or returns the already initialized singleton.
   * @throws {Error} if Docker can't be initialized
   * @returns {Docker} as a singleton
   */
  get(): Docker {
    if (!this.docker) {
      try {
        this.docker = new Docker();
      } catch (error) {
        throw new NestedError(
          'DockerFactory, get: Errored initializing docker',
          error,
        );
      }
    }
    return this.docker;
  }
}
