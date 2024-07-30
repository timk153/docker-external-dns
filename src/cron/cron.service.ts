import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setInterval, clearInterval } from 'timers';
import { AppService } from '../app.service';

export enum State {
  Stopped,
  Started,
}

@Injectable()
export class CronService implements OnModuleDestroy {
  private state = State.Stopped;

  private startedIntervalToken?: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private appService: AppService,
  ) {}

  start() {
    if (this.state === State.Started)
      throw new Error('CronService, start: Service already started');
    const interval = this.configService.get<number>(
      'EXECUTION_FREQUENCY_SECONDS',
      {
        infer: true,
      },
    );
    this.appService.synchronise();
    this.startedIntervalToken = setInterval(() => {
      this.appService.synchronise();
    }, interval);
    this.state = State.Started;
  }

  stop() {
    if (this.state === State.Stopped)
      throw Error('CronService, stop: Service already stopped');
    clearInterval(this.startedIntervalToken);
    this.state = State.Stopped;
  }

  onModuleDestroy() {
    this.stop();
  }
}
