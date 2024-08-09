import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout, clearTimeout } from 'timers';
import { AppService } from '../app.service';
import { getLogClassDecorator } from '../utility.functions';
import { ConsoleLoggerService } from '../logger.service';

let loggerPointer: ConsoleLoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

export enum State {
  Stopped,
  Started,
}

@LogDecorator()
@Injectable()
export class CronService implements OnModuleDestroy {
  private state = State.Stopped;

  private startedTimeoutToken?: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private appService: AppService,
    private loggerService: ConsoleLoggerService,
  ) {
    loggerPointer = this.loggerService;
  }

  /**
   * Starts the CRON Job executing.
   * Will execute "synchronise" immediately on invocation and then every x seconds
   * as distated by the environment variable EXECUTION_FREQUENCY_SECONDS.
   * @throws {Error} If service is already started
   */
  start() {
    if (this.state === State.Started)
      throw new Error('CronService, start: Service already started');
    const interval = this.configService.get<number>(
      'EXECUTION_FREQUENCY_SECONDS',
      {
        infer: true,
      },
    );
    this.loggerService.log(
      `Staring CRON job, execution frequency is every ${interval} seconds`,
    );
    this.appService.synchronise();
    const queue = () => {
      this.startedTimeoutToken = setTimeout(() => {
        this.appService.synchronise();
        queue();
      }, interval * 1000);
    };
    queue();
    this.state = State.Started;
  }

  /**
   * Stops the CronJob executing.
   * @throws {Error} if CRON job is not running.
   */
  stop() {
    if (this.state === State.Stopped)
      throw Error('CronService, stop: Service already stopped');
    this.loggerService.log('Stopping CRON job');
    clearTimeout(this.startedTimeoutToken);
    this.state = State.Stopped;
  }

  /**
   * Lifecycle event hook for NestJs:
   * https://docs.nestjs.com/fundamentals/lifecycle-events
   *
   * Stops the cron job service if the application is shutting down.
   */
  onModuleDestroy() {
    this.stop();
  }
}
