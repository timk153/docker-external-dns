import { OnModuleDestroy } from '@nestjs/common';
import { getLogClassDecorator } from '../utility.functions';
import { ConsoleLoggerService } from '../logger.service';

let loggerPointer: ConsoleLoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

export enum State {
  Stopped,
  Started,
}

@LogDecorator()
export abstract class CronService implements OnModuleDestroy {
  protected stateCron = State.Stopped;

  private startedTimeoutToken?: NodeJS.Timeout;

  constructor(protected loggerService: ConsoleLoggerService) {
    loggerPointer = this.loggerService;
  }

  /**
   * Returns how frequently the job will be executed in seconds
   */
  abstract get ExecutionFrequencySeconds(): number;

  /**
   * The service name which will appear in log messages
   */
  abstract get ServiceName(): string;

  /**
   * The job which will be executed by the cron job.
   * Must be implemented by the derived class
   */
  abstract job(): Promise<void>;

  /**
   * Starts the CRON Job executing.
   * Will execute "synchronise" immediately on invocation and then every x seconds
   * as distated by the environment variable EXECUTION_FREQUENCY_SECONDS.
   * @throws {Error} If service is already started
   */
  async start() {
    if (this.stateCron === State.Started)
      throw new Error(
        `CronService (${this.ServiceName}), start: Service already started`,
      );
    this.loggerService.log(
      `Staring CRON job for ${this.ServiceName}, execution frequency is every ${this.ExecutionFrequencySeconds} seconds`,
    );
    await this.job();
    const queue = () => {
      this.startedTimeoutToken = setTimeout(async () => {
        await this.job();
        queue();
      }, this.ExecutionFrequencySeconds * 1000);
    };
    queue();
    this.stateCron = State.Started;
  }

  /**
   * Stops the CronJob executing.
   * @throws {Error} if CRON job is not running.
   */
  stop() {
    if (this.stateCron === State.Stopped)
      throw Error(
        `CronService (${this.ServiceName}), stop: Service already stopped`,
      );
    this.loggerService.log(`Stopping CRON job for ${this.ServiceName}`);
    clearTimeout(this.startedTimeoutToken);
    this.stateCron = State.Stopped;
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
