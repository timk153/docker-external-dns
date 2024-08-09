import each from 'jest-each';
import { ConfigService } from '@nestjs/config';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConsoleLoggerService, isLogLevel } from './logger.service';

describe('LoggerService', () => {
  let mockConfigService: DeepMocked<ConfigService>;

  beforeAll(async () => {
    mockConfigService = createMock<ConfigService>();
  });

  const logLevelResults = {
    fatal: [true, false, false, false, false, false],
    error: [true, true, false, false, false, false],
    warn: [true, true, true, false, false, false],
    log: [true, true, true, true, false, false],
    debug: [true, true, true, true, true, false],
    verbose: [true, true, true, true, true, true],
  };

  /**
   * Appreciate this is testing the behavior of the nestjs logger!
   * However it tests that it's seeded with the LOG_LEVEL from the config service.
   *
   * Couldn't true unit test as can't mock the constructor of LoggerService.
   * So integration style test that checks behavior used instead.
   */
  each(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).it(
    'Should log output for the appropriate levels (level %p)',
    async (level: 'fatal' | 'error' | 'warn' | 'log' | 'debug' | 'verbose') => {
      // arrange
      mockConfigService.get.mockImplementation((property) => {
        if (property === 'LOG_LEVEL') return level;
        return undefined;
      });

      // act
      const sut = new ConsoleLoggerService(mockConfigService);

      // assert
      expect(sut.isLevelEnabled('fatal')).toBe(logLevelResults[level][0]);
      expect(sut.isLevelEnabled('error')).toBe(logLevelResults[level][1]);
      expect(sut.isLevelEnabled('warn')).toBe(logLevelResults[level][2]);
      expect(sut.isLevelEnabled('log')).toBe(logLevelResults[level][3]);
      expect(sut.isLevelEnabled('debug')).toBe(logLevelResults[level][4]);
      expect(sut.isLevelEnabled('verbose')).toBe(logLevelResults[level][5]);
    },
  );

  it('Should default to error if supplied LOG_LEVEL is invalid, otherwise the errors arent visible', () => {
    // arrange
    const expectedLevel = 'error';
    mockConfigService.get.mockImplementation((property) => {
      if (property === 'LOG_LEVEL') return 'invalid-level';
      return undefined;
    });

    // act
    const sut = new ConsoleLoggerService(mockConfigService);

    // assert
    expect(sut.isLevelEnabled('fatal')).toBe(logLevelResults[expectedLevel][0]);
    expect(sut.isLevelEnabled('error')).toBe(logLevelResults[expectedLevel][1]);
    expect(sut.isLevelEnabled('warn')).toBe(logLevelResults[expectedLevel][2]);
    expect(sut.isLevelEnabled('log')).toBe(logLevelResults[expectedLevel][3]);
    expect(sut.isLevelEnabled('debug')).toBe(logLevelResults[expectedLevel][4]);
    expect(sut.isLevelEnabled('verbose')).toBe(
      logLevelResults[expectedLevel][5],
    );
  });

  describe('isLogLevel', () => {
    each(['log', 'error', 'warn', 'debug', 'verbose', 'fatal']).it(
      'Should validate LogLevel (%p)',
      (value) => {
        // act / assert
        expect(isLogLevel(value)).toBe(true);
      },
    );

    it('Should invalidate non LogLevels', () => {
      // act / assert
      expect(isLogLevel('invalid')).toBe(false);
    });
  });
});
