import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { NestedError } from '../errors/nested-error';
import { ConsoleLoggerService } from '../logger.service';
import { validDnsAEntry } from '../dto/dnsa-entry.spec';
import { DnsaEntry } from '../dto/dnsa-entry';
import { validDnsCnameEntry } from '../dto/dnscname-entry.spec';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { validDnsMxEntry } from '../dto/dnsmx-entry.spec';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { validDnsNsEntry } from '../dto/dnsns-entry.spec';
import { DnsNsEntry } from '../dto/dnsns-entry';
import { DdnsService, IPInfoIOResponse } from './ddns.service';
import { State } from '../cron/cron.service';

describe('DdnsService', () => {
  let spyFetch: jest.SpyInstance;

  const spyFetchJsonValue: IPInfoIOResponse = {
    ip: '8.8.8.8',
  };
  const mockFetchValue = createMock(Response);
  const mockFetchJson = jest.fn().mockResolvedValue(spyFetchJsonValue);
  mockFetchValue.json = mockFetchJson;

  let sut: DdnsService;
  let mockConsoleLoggerService: DeepMocked<ConsoleLoggerService>;

  const envDdnsExecutionFrequencyMinutes = 120;
  let mockConfigService: DeepMocked<ConfigService>;
  const mockConfigServiceGetValue = {
    DDNS_EXECUTION_FREQUENCY_MINUTES: envDdnsExecutionFrequencyMinutes,
  };

  beforeEach(async () => {
    spyFetch = jest.spyOn(global, 'fetch');
    spyFetch.mockResolvedValue(mockFetchValue);

    const module: TestingModule = await Test.createTestingModule({
      providers: [DdnsService],
    })
      .useMocker(createMock)
      .compile();

    mockConsoleLoggerService = module.get(ConsoleLoggerService);

    mockConfigService = module.get<ConfigService>(
      ConfigService,
    ) as DeepMocked<ConfigService>;
    mockConfigService.get.mockImplementation(
      (propertyPath) => mockConfigServiceGetValue[propertyPath],
    );

    sut = module.get<DdnsService>(DdnsService);
  });

  afterEach(() => {
    spyFetch.mockRestore();
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    expect(sut).toBeDefined();
  });

  it('should have correct service name', () => {
    expect(sut.ServiceName).toEqual('DdnsService');
  });

  describe('getState', () => {
    it('Should expose the state instance variable of CronService', () => {
      // arrange
      sut['stateCron'] = State.Started;

      // act / assert
      expect(sut.getState()).toBe(sut['stateCron']);
    });
  });

  describe('getIPAddress', () => {
    it('Should expose the ipAddress instance variable', () => {
      // arrange
      sut['ipAddress'] = 'ip-address';

      // act / assert
      expect(sut.getIPAddress()).toBe(sut['ipAddress']);
    });
  });

  describe('ExecutionIntervalSeconds property', () => {
    it('should load property from configuration', () => {
      // act / assert
      expect(sut.ExecutionFrequencySeconds).toEqual(
        envDdnsExecutionFrequencyMinutes * 60,
      );
      expect(mockConfigService.get).toHaveBeenCalledTimes(1);
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'DDNS_EXECUTION_FREQUENCY_MINUTES',
        { infer: true },
      );
    });
  });

  describe('isDdnsRequired', () => {
    const paramEntries = [
      validDnsAEntry(DnsaEntry),
      validDnsCnameEntry(DnsCnameEntry),
      validDnsMxEntry(DnsMxEntry),
      validDnsNsEntry(DnsNsEntry),
    ];

    it("should return true if one or more A records has address of 'DDNS'", () => {
      // arrange
      const ddnsEntry = validDnsAEntry(DnsaEntry, { address: 'DDNS' });

      // act / assert
      expect(sut.isDdnsRequired([...paramEntries, ddnsEntry])).toBe(true);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
          method: 'isDdnsRequired',
          service: 'DdnsService',
        }),
      );
    });

    it("should return false as no A type entries have an address of 'DDNS'", () => {
      // act / assert
      expect(sut.isDdnsRequired(paramEntries)).toBe(false);
    });
  });

  describe('job', () => {
    it('Should log error, but not throw if fetch fails', async () => {
      // arrange
      const expectedIpAddress = 'ip-address';
      sut['ipAddress'] = expectedIpAddress;
      const error = new Error('unexpected-error');
      const expected = new NestedError(
        'DdnsService, job: Error fetching IP Address',
        error,
      );
      spyFetch.mockRejectedValueOnce(error);

      // act
      await sut.job();

      // assert
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(expected);
      expect(sut['ipAddress']).toEqual(expectedIpAddress);
    });

    it("Should log error, but not throw if response isn't json", async () => {
      // arrange
      const expectedIpAddress = 'ip-address';
      sut['ipAddress'] = expectedIpAddress;
      const error = new Error('not-json-error');
      const expected = new NestedError(
        'DdnsService, job: Error fetching IP Address, deserilizing response failed',
        error,
      );
      mockFetchJson.mockRejectedValueOnce(error);

      // act
      await sut.job();

      // assert
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(expected);
      expect(sut['ipAddress']).toEqual(expectedIpAddress);
    });

    it('Should log error, but not throw if response is unexpected shape', async () => {
      // arrange
      const expectedIpAddress = 'ip-address';
      sut['ipAddress'] = expectedIpAddress;
      const response = { invalid: 'response' };
      const expected = new Error(
        `DdnsService, job: Error fetching IP Address, response has unexpected shape (${response})`,
      );
      mockFetchJson.mockResolvedValueOnce(response);

      // act
      await sut.job();

      // assert
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(expected);
      expect(sut['ipAddress']).toEqual(expectedIpAddress);
    });

    it('Should warn if response is invalid', async () => {
      // arrange
      const expectedIpAddress = 'ip-address';
      sut['ipAddress'] = expectedIpAddress;
      const response = { ip: 'not-an-ip-address' };
      const expected = new Error(
        `DdnsService, job: Error fetching IP Address, value returned as ip address is not recognisable as an ip address (${response.ip})`,
      );
      mockFetchJson.mockResolvedValueOnce(response);

      // act
      await sut.job();

      // assert
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(expected);
      expect(sut['ipAddress']).toEqual(expectedIpAddress);
    });

    it('Should not log out change if ip hasnt changed', async () => {
      // arrange
      sut['ipAddress'] = spyFetchJsonValue.ip;

      // act
      await sut.job();

      // assert
      expect(sut['ipAddress']).toEqual(spyFetchJsonValue.ip);
      expect(mockConsoleLoggerService.error).not.toHaveBeenCalled();
      expect(mockConsoleLoggerService.log).not.toHaveBeenCalled();
    });

    it('Should set ipAddress when successful and changed (undefined to value)', async () => {
      // arrange
      sut['ipAddress'] = undefined;

      // act
      await sut.job();

      // assert
      expect(spyFetch).toHaveBeenCalledTimes(1);
      expect(spyFetch).toHaveBeenCalledWith('https://ipinfo.io', {
        headers: { accept: 'application/json' },
      });
      expect(mockFetchJson).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).not.toHaveBeenCalled();
      expect(sut['ipAddress']).toEqual(spyFetchJsonValue.ip);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledWith(
        `DDNS Service found a new IP address ${spyFetchJsonValue.ip}. DNS will update on next synchronisation.`,
      );
    });

    it('Should set ipAddress when successful and changed (value to value)', async () => {
      // arrange
      const oldIPAddress = 'an-ip-address';
      sut['ipAddress'] = oldIPAddress;

      // act
      await sut.job();

      // assert
      expect(spyFetch).toHaveBeenCalledTimes(1);
      expect(spyFetch).toHaveBeenCalledWith('https://ipinfo.io', {
        headers: { accept: 'application/json' },
      });
      expect(mockFetchJson).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).not.toHaveBeenCalled();
      expect(sut['ipAddress']).toEqual(spyFetchJsonValue.ip);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledWith(
        `DDNS Service found a new IP address ${spyFetchJsonValue.ip}, old address was ${oldIPAddress}. DNS will update on next synchronisation.`,
      );
    });
  });
});
