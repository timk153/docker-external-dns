import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { setInterval, clearInterval } from 'timers';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../app.service';
import { CronService, State } from './cron.service';
import { ConsoleLoggerService } from '../logger.service';

jest.mock('timers');

const mockClearInterval = clearInterval as jest.MockedFunction<
  typeof clearInterval
>;
const mockSetInterval = setInterval as jest.MockedFunction<typeof setInterval>;
const mockSetIntervalValue = 'set-interval-value' as unknown as NodeJS.Timeout;
mockSetInterval.mockReturnValue(mockSetIntervalValue);

describe('CronService', () => {
  let sut: CronService;
  let mockConfigService: DeepMocked<ConfigService>;
  let mockAppService: DeepMocked<AppService>;
  let mockConsoleLoggerService: DeepMocked<ConsoleLoggerService>;
  const envExecutionFrequencySeconds = 9999;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CronService],
    })
      .useMocker(createMock)
      .compile();

    mockConfigService = module.get<ConfigService>(
      ConfigService,
    ) as DeepMocked<ConfigService>;
    mockConfigService.get.mockImplementation((path) => {
      if (path === 'EXECUTION_FREQUENCY_SECONDS')
        return envExecutionFrequencySeconds;
      throw new Error('Unexpected property requested');
    });

    mockAppService = module.get<AppService>(
      AppService,
    ) as DeepMocked<AppService>;

    mockConsoleLoggerService = module.get(ConsoleLoggerService);

    sut = module.get<CronService>(CronService);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('start', () => {
    it('should error if already started', () => {
      // arrange
      const expected = new Error('CronService, start: Service already started');
      sut['state'] = State.Started;

      // act / assert
      expect(() => sut.start()).toThrow(expected);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'start',
          service: 'CronService',
        }),
      );
    });

    it('should execute "synchronise" at regular intervals', async () => {
      // arrange
      sut['state'] = State.Stopped;
      delete sut['startedIntervalToken'];

      // act
      sut.start();

      // assert
      expect(mockConsoleLoggerService.log).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledWith(
        `Staring CRON job, execution frequency is every ${envExecutionFrequencySeconds} seconds`,
      );
      expect(mockConfigService.get).toHaveBeenCalledTimes(1);
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'EXECUTION_FREQUENCY_SECONDS',
        { infer: true },
      );
      expect(mockSetInterval).toHaveBeenCalledTimes(1);
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        envExecutionFrequencySeconds,
      );
      expect(mockAppService.synchronise).toHaveBeenCalledTimes(1);
      expect(sut['state']).toEqual(State.Started);
      expect(sut['startedIntervalToken']).toBe(mockSetIntervalValue);

      // arrange
      const job = mockSetInterval.mock.lastCall?.[0];
      if (job === undefined) throw new Error("job shouldn't be undefined");

      // act
      await job();

      // assert
      expect(mockAppService.synchronise).toHaveBeenCalledTimes(2);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should error if already stopped', () => {
      // arrange
      const expected = new Error('CronService, stop: Service already stopped');
      sut['state'] = State.Stopped;

      // act / asse;rt
      expect(() => sut.stop()).toThrow(expected);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'stop',
          service: 'CronService',
        }),
      );
    });

    it('should stop the execution loop', async () => {
      // arrange
      sut['state'] = State.Started;
      sut['startedIntervalToken'] = mockSetIntervalValue;

      // act
      sut.stop();

      // assert
      expect(mockConsoleLoggerService.log).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledWith(
        'Stopping CRON job',
      );
      expect(mockClearInterval).toHaveBeenCalledTimes(1);
      expect(mockClearInterval).toHaveBeenCalledWith(mockSetIntervalValue);
      expect(sut['state']).toEqual(State.Stopped);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
          method: 'stop',
          service: 'CronService',
        }),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop the cron job', () => {
      // arrange
      const spyStop = jest.spyOn(sut, 'stop').mockReturnValue();

      // act
      sut.onModuleDestroy();

      // assert
      expect(spyStop).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
          method: 'onModuleDestroy',
          service: 'CronService',
        }),
      );

      // clean up
      spyStop.mockRestore();
    });
  });
});
