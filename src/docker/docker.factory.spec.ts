import { Test, TestingModule } from '@nestjs/testing';
import Docker from 'dockerode';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NestedError } from '../errors/nested-error';
import { DockerFactory } from './docker.factory';
import { ConsoleLoggerService } from '../logger.service';

jest.mock('dockerode');

const dockerMock = Docker as jest.MockedClass<typeof Docker>;
const dockerMockValue = {} as Docker;

describe('DockerFactory', () => {
  let sut: DockerFactory;
  let mockConsoleLoggerService: DeepMocked<ConsoleLoggerService>;

  beforeAll(() => {
    dockerMock.mockReturnValue(dockerMockValue);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DockerFactory],
    })
      .useMocker(createMock)
      .compile();

    mockConsoleLoggerService = module.get(ConsoleLoggerService);

    sut = module.get<DockerFactory>(DockerFactory);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('get', () => {
    it('should initialize Docker and return the instance', () => {
      // act
      const result = sut.get();

      // assert
      expect(dockerMock).toHaveBeenCalledTimes(1);
      expect(result).toBe(dockerMockValue);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
          method: 'get',
          service: 'DockerFactory',
        }),
      );
    });

    it('should return the existing instance', () => {
      // act
      const firstResult = sut.get();
      const secondResult = sut.get();

      // assert
      expect(dockerMock).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(secondResult);
    });

    it('should throw if initialize fails', () => {
      // arrange
      const dockerError = new Error('Failed To Initialize');
      const error = new NestedError(
        'DockerFactory, get: Errored initializing docker',
        dockerError,
      );

      dockerMock.mockImplementationOnce(() => {
        throw dockerError;
      });

      // act / assert
      expect(() => sut.get()).toThrow(error);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'get',
          service: 'DockerFactory',
        }),
      );
    });
  });
});
