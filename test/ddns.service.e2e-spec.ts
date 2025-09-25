import { createMock } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DdnsService, IPInfoIOResponse } from '../src/ddns/ddns.service';
import { getConfigModuleImport } from '../src/app.configuration';

describe('DDNSService (Integration)', () => {
  let app: INestApplication;
  let sut: DdnsService;

  const spyFetch = jest.spyOn(global, 'fetch');

  beforeAll(() => {
    jest.useFakeTimers();
  });
  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        {
          module: AppModule,
          imports: [getConfigModuleImport()],
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sut = app.get(DdnsService);
  });

  afterAll(() => {
    spyFetch.mockRestore();
    jest.useRealTimers();
  });

  it('Should fetch public ip address every 60 minutes', async () => {
    // arrange
    const mockIP = {
      first: '8.8.8.8',
      second: '1.1.1.1',
    };

    const mockResponseJsonValue: IPInfoIOResponse = { ip: mockIP.first };

    const mockResponse = createMock(Response);
    const mockResponseJson = jest.fn();
    mockResponse.json = mockResponseJson;
    mockResponseJson.mockResolvedValue(mockResponseJsonValue);

    spyFetch.mockResolvedValue(mockResponse as unknown as Response);

    // act
    await sut.start();

    // assert
    expect(sut.getIPAddress()).toEqual(mockIP.first);

    // arrange
    mockResponseJsonValue.ip = mockIP.second;

    // act
    await jest.advanceTimersToNextTimerAsync();

    // assert
    expect(sut.getIPAddress()).toEqual(mockIP.second);

    // clean up
    await sut.stop();
  });

  it('Should error without crashing or overwriting previously fetched value', async () => {
    // arrange
    const mockIP = {
      first: 'not-an-ip-address',
      second: '1.1.1.1',
      third: 'not-an-ip-address',
      fourth: '9.9.9.9',
    };

    const mockResponseJsonValue: IPInfoIOResponse = { ip: mockIP.first };

    const mockResponse = createMock(Response);
    const mockResponseJson = jest.fn();
    mockResponse.json = mockResponseJson;
    mockResponseJson.mockResolvedValue(mockResponseJsonValue);

    spyFetch.mockResolvedValue(mockResponse as unknown as Response);

    // act
    await sut.start();

    // assert
    expect(sut.getIPAddress()).toBeUndefined();

    // arrange
    mockResponseJsonValue.ip = mockIP.second;

    // act
    await jest.advanceTimersToNextTimerAsync();

    // assert
    expect(sut.getIPAddress()).toEqual(mockIP.second);

    // arrange
    mockResponseJsonValue.ip = mockIP.third;

    // act
    await jest.advanceTimersToNextTimerAsync();

    // assert
    expect(sut.getIPAddress()).toEqual(mockIP.second);

    // arrange
    mockResponseJsonValue.ip = mockIP.fourth;

    // act
    await jest.advanceTimersToNextTimerAsync();

    // assert
    expect(sut.getIPAddress()).toEqual(mockIP.fourth);

    // arrange
    const error = new Error('error-fetching-ip');
    mockResponseJsonValue.ip = mockIP.second;
    spyFetch.mockRejectedValueOnce(error);

    // act
    await jest.advanceTimersToNextTimerAsync();

    // assert
    expect(sut.getIPAddress()).toEqual(mockIP.fourth);
  });
});
