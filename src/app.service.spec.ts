import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ContainerInfo } from 'dockerode';
import { Zone } from 'cloudflare/resources/zones/zones';
import { Record, RecordCreateParams } from 'cloudflare/resources/dns/records';
import { ConfigService } from '@nestjs/config';
import { AppService, State } from './app.service';
import { DockerService } from './docker/docker.service';
import { CloudFlareService } from './cloud-flare/cloud-flare.service';
import { CloudFlareFactory } from './cloud-flare/cloud-flare.factory';
import { DnsbaseEntry, DNSTypes, ICloudFlareEntry } from './dto/dnsbase-entry';
import { DnsBaseCloudflareEntry } from './dto/dnsbase-entry.spec';
import { SetDifference, computeSetDifference } from './app.functions';
import { DnsaCloudflareEntry } from './dto/dnsa-cloudflare-entry';
import { isDnsAEntry } from './dto/dnsa-entry';
import { isDnsCnameEntry } from './dto/dnscname-entry';
import { isDnsMxEntry } from './dto/dnsmx-entry';
import { isDnsNsEntry } from './dto/dnsns-entry';
import { ConsoleLoggerService } from './logger.service';
import { DdnsService } from './ddns/ddns.service';
import { State as CronState } from './cron/cron.service';

jest.mock('./app.functions');
jest.mock('./dto/dnsa-entry', () => {
  const actual = jest.requireActual('./dto/dnsa-entry');
  return { ...actual, isDnsAEntry: jest.fn() };
});
jest.mock('./dto/dnscname-entry', () => {
  const actual = jest.requireActual('./dto/dnscname-entry');
  return { ...actual, isDnsCnameEntry: jest.fn() };
});
jest.mock('./dto/dnsmx-entry', () => {
  const actual = jest.requireActual('./dto/dnsmx-entry');
  return { ...actual, isDnsMxEntry: jest.fn() };
});
jest.mock('./dto/dnsns-entry', () => {
  const actual = jest.requireActual('./dto/dnsns-entry');
  return { ...actual, isDnsNsEntry: jest.fn() };
});

const mockAppFunctionsComputeSetDifference =
  computeSetDifference as jest.MockedFunction<typeof computeSetDifference>;
const mockIsDnsAEntry = isDnsAEntry as jest.MockedFunction<typeof isDnsAEntry>;
const mockIsDnsCnameEntry = isDnsCnameEntry as jest.MockedFunction<
  typeof isDnsCnameEntry
>;
const mockIsDnsMxEntry = isDnsMxEntry as jest.MockedFunction<
  typeof isDnsMxEntry
>;
const mockIsDnsNsEntry = isDnsNsEntry as jest.MockedFunction<
  typeof isDnsNsEntry
>;

describe('AppService', () => {
  let sut: AppService;
  let mockDockerService: DeepMocked<DockerService>;
  const mockDockerServiceGetContainersValues = [
    'container-1',
    'container-2',
  ] as unknown as ContainerInfo[];

  const mockDockerServiceExtractDNSEntriesValues = [
    { name: 'extracted-docker-entry-1', address: 'not-ddns', type: DNSTypes.A },
    { name: 'extracted-docker-entry-2', type: DNSTypes.CNAME },
  ] as unknown as DnsbaseEntry[];
  const mockCloudFlareServiceGetZonesValues = [
    { id: 'zone-1' },
    { id: 'zone-2' },
    { id: 'zone-3' },
  ] as unknown as Zone[];
  const mockCloudFlareServiceGetDNSEntriesValues = {
    'zone-1': ['zone-1-1', 'zone-1-2'] as unknown as Record[],
    'zone-2': ['zone-2-1', 'zone-2-2'] as unknown as Record[],
    'zone-3': ['zone-3-1', 'zone-3-2'] as unknown as Record[],
  } as { [key: string]: Record[] };
  const mockCloudFlareServiceMapDNSEntriesValues = {
    'zone-1': [
      'mapped-zone-1-1',
      'mapped-zone-1-2',
    ] as unknown as DnsaCloudflareEntry[],
    'zone-2': [
      'mapped-zone-2-1',
      'mapped-zone-2-2',
    ] as unknown as DnsaCloudflareEntry[],
    'zone-3': [
      'mapped-zone-3-1',
      'mapped-zone-3-2',
    ] as unknown as DnsaCloudflareEntry[],
  } as { [key: string]: DnsaCloudflareEntry[] };
  const mockCloudFlareFactoryCreateOrUpdateARecordParamsValue =
    'create-or-update-a-record-param' as unknown as RecordCreateParams.ARecord;
  const mockCloudFlareFactoryCreateOrUpdateCNAMERecordParamsValue =
    'create-or-update-cname-record-param' as unknown as RecordCreateParams.CNAMERecord;
  const mockCloudFlareFactoryCreateOrUpdateMXRecordParamsValue =
    'create-or-update-mx-record-param' as unknown as RecordCreateParams.MXRecord;
  const mockCloudFlareFactoryCreateOrUpdateNSRecordParamsValue =
    'create-or-update-ns-record-param' as unknown as RecordCreateParams.NSRecord;
  const mockAppFunctionsComputeSetDifferenceValue: SetDifference = {
    add: [
      { name: 'add-1-a', type: DNSTypes.A },
      { name: 'add-2-cname', type: DNSTypes.CNAME },
      { name: 'add-3-mx', type: DNSTypes.MX },
      { name: 'add-4-ns', type: DNSTypes.NS },
      { name: 'unsuccessful-1', type: DNSTypes.CNAME },
    ] as unknown as DnsbaseEntry[],
    update: [
      {
        old: {
          zoneId: 'zone-2',
          id: 'record-id-1',
        } as unknown as ICloudFlareEntry,
        update: {
          id: 'record-id-1',
          name: 'updated-1-a',
          type: DNSTypes.A,
        } as unknown as DnsbaseEntry,
      },
      {
        old: {
          zoneId: 'zone-2',
          id: 'record-id-2',
        } as unknown as ICloudFlareEntry,
        update: {
          id: 'record-id-2',
          name: 'updated-2-cname',
          type: DNSTypes.CNAME,
        } as unknown as DnsbaseEntry,
      },
      {
        old: {
          zoneId: 'zone-1',
          id: 'record-id-3',
        } as unknown as ICloudFlareEntry,
        update: {
          id: 'record-id-3',
          name: 'updated-3-mx',
          type: DNSTypes.MX,
        } as unknown as DnsbaseEntry,
      },
      {
        old: {
          zoneId: 'zone-3',
          id: 'record-id-4',
        } as unknown as ICloudFlareEntry,
        update: {
          id: 'record-id-4',
          name: 'updated-4-ns',
          type: DNSTypes.NS,
        } as unknown as DnsbaseEntry,
      },
    ],
    delete: [
      { id: 'delete-1', name: 'delete-1' },
      { id: 'delete-2', name: 'delete-2' },
    ] as unknown as ICloudFlareEntry[],
    unchanged: ['unchanged-1'] as unknown as ICloudFlareEntry[],
  };
  const mockCloudFlareServiceGetZoneForEntryValues = {
    [DNSTypes.A]: 'zone-2',
    [DNSTypes.CNAME]: 'zone-2',
    [DNSTypes.MX]: 'zone-1',
    [DNSTypes.NS]: 'zone-3',
  } as { [key: string]: string };

  let mockCloudFlareService: DeepMocked<CloudFlareService>;
  let mockCloudFlareFactory: DeepMocked<CloudFlareFactory>;
  let mockConsoleLoggerService: DeepMocked<ConsoleLoggerService>;
  const envExecutionFrequencySeconds = 999;
  let mockConfigService: DeepMocked<ConfigService>;
  const mockConfigServiceGetValue = {
    EXECUTION_FREQUENCY_SECONDS: envExecutionFrequencySeconds,
  };
  let mockDdnsService: DeepMocked<DdnsService>;
  let mockDdnsServiceIsDdnsRequiredValue = false;
  const mockDdnsServiceGetIPAddressValue = 'ddns-service-ip-address';
  let mockDdnsServiceGetStateValue = CronState.Stopped;

  beforeAll(() => {
    mockAppFunctionsComputeSetDifference.mockReturnValue(
      mockAppFunctionsComputeSetDifferenceValue,
    );
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    })
      .useMocker(createMock)
      .compile();

    mockDockerService = module.get(DockerService);
    mockDockerService.getContainers.mockResolvedValue(
      mockDockerServiceGetContainersValues,
    );
    mockDockerService.extractDNSEntries.mockReturnValue(
      mockDockerServiceExtractDNSEntriesValues,
    );

    mockCloudFlareService = module.get(CloudFlareService);
    mockCloudFlareService.getZones.mockResolvedValue(
      mockCloudFlareServiceGetZonesValues,
    );
    mockCloudFlareService.getDNSEntries.mockImplementation((zoneId) =>
      Promise.resolve(mockCloudFlareServiceGetDNSEntriesValues[zoneId]),
    );
    mockCloudFlareService.mapDNSEntries.mockImplementation(
      (zoneId) => mockCloudFlareServiceMapDNSEntriesValues[zoneId],
    );
    mockCloudFlareService.getZoneForEntry.mockImplementation((zones, entry) => {
      if (entry.name.startsWith('unsuccessful')) return { isSuccessful: false };
      const zone = {
        id: mockCloudFlareServiceGetZoneForEntryValues[entry.type],
      } as unknown as Zone;
      return { isSuccessful: true, zone };
    });
    mockCloudFlareFactory = module.get(CloudFlareFactory);
    mockCloudFlareFactory.createOrUpdateARecordParams.mockReturnValue(
      mockCloudFlareFactoryCreateOrUpdateARecordParamsValue,
    );
    mockCloudFlareFactory.createOrUpdateCNAMERecordParams.mockReturnValue(
      mockCloudFlareFactoryCreateOrUpdateCNAMERecordParamsValue,
    );
    mockCloudFlareFactory.createOrUpdateMXRecordParams.mockReturnValue(
      mockCloudFlareFactoryCreateOrUpdateMXRecordParamsValue,
    );
    mockCloudFlareFactory.createOrUpdateNSRecordParams.mockReturnValue(
      mockCloudFlareFactoryCreateOrUpdateNSRecordParamsValue,
    );

    mockConsoleLoggerService = module.get(ConsoleLoggerService);

    mockConfigService = module.get(ConfigService) as DeepMocked<ConfigService>;
    mockConfigService.get.mockImplementation(
      (propertyPath) => mockConfigServiceGetValue[propertyPath],
    );

    mockDdnsService = module.get(DdnsService) as DeepMocked<DdnsService>;
    mockDdnsServiceIsDdnsRequiredValue = false;
    mockDdnsService.isDdnsRequired.mockImplementation(
      () => mockDdnsServiceIsDdnsRequiredValue,
    );
    mockDdnsService.getIPAddress.mockImplementation(
      () => mockDdnsServiceGetIPAddressValue,
    );
    mockDdnsService.getState.mockImplementation(
      () => mockDdnsServiceGetStateValue,
    );

    sut = module.get<AppService>(AppService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('should have correct service name', () => {
    expect(sut.ServiceName).toEqual('AppService');
  });

  describe('ExecutionIntervalSeconds property', () => {
    it('should load property from configuration', () => {
      // act / assert
      expect(sut.ExecutionFrequencySeconds).toEqual(
        envExecutionFrequencySeconds,
      );
      expect(mockConfigService.get).toHaveBeenCalledTimes(1);
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'EXECUTION_FREQUENCY_SECONDS',
        { infer: true },
      );
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      sut['state'] = State.Uninitialized;
    });

    it('should initialize', () => {
      // act
      sut.initialize();

      // assert
      expect(mockCloudFlareService.initialize).toHaveBeenCalledTimes(1);
      expect(mockDockerService.initialize).toHaveBeenCalledTimes(1);
      expect(sut['state']).toBe(State.Initialized);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
          method: 'initialize',
          service: 'AppService',
          params: '[]',
        }),
      );
    });

    it('should error if cloud-flare.service errors', () => {
      // arrange
      const error = new Error('cloud-flare-error');
      mockCloudFlareService.initialize.mockImplementationOnce(() => {
        throw error;
      });

      // act / assert
      expect(() => sut.initialize()).toThrow(error);
      expect(sut['state']).toBe(State.Uninitialized);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          error: error.stack,
          method: 'initialize',
          service: 'AppService',
          params: '[]',
        }),
      );
    });

    it('should error if docker.service errors', () => {
      // arrange
      const error = new Error('cloud-flare-error');
      mockDockerService.initialize.mockImplementationOnce(() => {
        throw error;
      });

      // act / assert
      expect(() => sut.initialize()).toThrow(error);
      expect(sut['state']).toBe(State.Uninitialized);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          error: error.stack,
          method: 'initialize',
          service: 'AppService',
          params: '[]',
        }),
      );
    });
  });

  describe('synchronise', () => {
    let backupGetCloudFlareRecordParameters: (typeof sut)['getCloudFlareRecordParameters'];
    const spyGetCloudFlareRecordParametersValue =
      'create-or-update-params' as unknown as ReturnType<
        (typeof sut)['getCloudFlareRecordParameters']
      >;
    const spyGetCloudFlareRecordParameters = jest
      .fn()
      .mockReturnValue(spyGetCloudFlareRecordParametersValue);

    beforeEach(() => {
      // manually install spy as private method
      backupGetCloudFlareRecordParameters =
        sut['getCloudFlareRecordParameters'];
      sut['getCloudFlareRecordParameters'] = spyGetCloudFlareRecordParameters;

      // arrange initial state
      sut['state'] = State.Initialized;
    });

    afterEach(() => {
      // manually restore
      sut['getCloudFlareRecordParameters'] =
        backupGetCloudFlareRecordParameters;
    });

    it('should throw if uninitialized', async () => {
      // arrange
      const expected = new Error(
        'AppService, synchronize: Not initialized, cannot synchronize. Call initialize first',
      );
      sut['state'] = State.Uninitialized;

      // act / assert
      await expect(sut.job()).rejects.toThrow(expected);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'job',
          service: 'AppService',
          params: '[]',
        }),
      );
    });

    it('should throw if no zones', async () => {
      // arrange
      mockCloudFlareService.getZones.mockResolvedValueOnce([]);

      // act / assert
      await expect(sut.job()).rejects.toThrow(
        'AppService, synchronize: No zones returned from CloudFlare. Check API Token has Zone access and you have zones registered to your account',
      );
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'job',
          service: 'AppService',
          params: '[]',
        }),
      );
    });

    it('should synchronize', async () => {
      // act
      await sut.job();

      // assert
      expect(mockDockerService.initialize).not.toHaveBeenCalled();
      expect(mockDockerService.getContainers).toHaveBeenCalledTimes(1);
      expect(mockDockerService.extractDNSEntries).toHaveBeenCalledTimes(1);
      expect(mockDockerService.extractDNSEntries).toHaveBeenCalledWith(
        mockDockerServiceGetContainersValues,
      );
      expect(mockCloudFlareService.initialize).not.toHaveBeenCalled();
      expect(mockCloudFlareService.getZones).toHaveBeenCalledTimes(1);
      expect(mockCloudFlareService.getDNSEntries).toHaveBeenCalledTimes(3);
      mockCloudFlareServiceGetZonesValues.forEach(({ id }) => {
        expect(mockCloudFlareService.getDNSEntries).toHaveBeenCalledWith(id);
      });
      expect(mockCloudFlareService.mapDNSEntries).toHaveBeenCalledTimes(3);
      expect(mockCloudFlareService.mapDNSEntries).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZonesValues[0].id,
        mockCloudFlareServiceGetDNSEntriesValues['zone-1'],
      );
      expect(mockCloudFlareService.mapDNSEntries).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZonesValues[1].id,
        mockCloudFlareServiceGetDNSEntriesValues['zone-2'],
      );
      expect(mockCloudFlareService.mapDNSEntries).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZonesValues[2].id,
        mockCloudFlareServiceGetDNSEntriesValues['zone-3'],
      );
      expect(mockDdnsService.isDdnsRequired).toHaveBeenCalledTimes(1);
      expect(mockDdnsService.isDdnsRequired).toHaveBeenCalledWith(
        mockDockerServiceExtractDNSEntriesValues,
      );
      expect(mockDdnsService.start).not.toHaveBeenCalled();
      expect(mockDdnsService.stop).not.toHaveBeenCalled();
      expect(mockAppFunctionsComputeSetDifference).toHaveBeenCalledTimes(1);
      expect(mockAppFunctionsComputeSetDifference).toHaveBeenCalledWith(
        mockDockerServiceExtractDNSEntriesValues,
        [
          ...mockCloudFlareServiceMapDNSEntriesValues['zone-1'],
          ...mockCloudFlareServiceMapDNSEntriesValues['zone-2'],
          ...mockCloudFlareServiceMapDNSEntriesValues['zone-3'],
        ],
      );
      expect(mockCloudFlareService.getZoneForEntry).toHaveBeenCalledTimes(5);
      const { add, update } = mockAppFunctionsComputeSetDifferenceValue;
      const deletions = mockAppFunctionsComputeSetDifferenceValue.delete;
      [...add].forEach((paramEntry) => {
        expect(mockCloudFlareService.getZoneForEntry).toHaveBeenCalledWith(
          mockCloudFlareServiceGetZonesValues,
          paramEntry,
        );
      });
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledTimes(8);
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZoneForEntryValues[add[0].type],
        add[0],
      );
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZoneForEntryValues[add[0].type],
        add[0],
      );
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZoneForEntryValues[add[0].type],
        add[0],
      );
      let updateOldEntry = update[0].old as unknown as DnsBaseCloudflareEntry;
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        updateOldEntry.zoneId,
        {
          id: updateOldEntry.id,
          ...update[0].update,
        },
      );
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZoneForEntryValues[add[1].type],
        add[1],
      );
      updateOldEntry = update[1].old as unknown as DnsBaseCloudflareEntry;
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        updateOldEntry.zoneId,
        {
          id: updateOldEntry.id,
          ...update[1].update,
        },
      );
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        mockCloudFlareServiceGetZoneForEntryValues[add[2].type],
        add[2],
      );
      updateOldEntry = update[2].old as unknown as DnsBaseCloudflareEntry;
      expect(spyGetCloudFlareRecordParameters).toHaveBeenCalledWith(
        updateOldEntry.zoneId,
        {
          id: updateOldEntry.id,
          ...update[2].update,
        },
      );
      expect(mockCloudFlareService.createEntry).toHaveBeenCalledTimes(4);
      expect(mockCloudFlareService.createEntry).toHaveBeenCalledWith(
        spyGetCloudFlareRecordParametersValue,
      );
      expect(mockCloudFlareService.updateEntry).toHaveBeenCalledTimes(4);
      expect(mockCloudFlareService.updateEntry).toHaveBeenCalledWith(
        (update[0].old as any).id,
        spyGetCloudFlareRecordParametersValue,
      );
      expect(mockCloudFlareService.updateEntry).toHaveBeenCalledWith(
        (update[1].old as any).id,
        spyGetCloudFlareRecordParametersValue,
      );
      expect(mockCloudFlareService.updateEntry).toHaveBeenCalledWith(
        (update[2].old as any).id,
        spyGetCloudFlareRecordParametersValue,
      );
      expect(mockCloudFlareService.updateEntry).toHaveBeenCalledWith(
        (update[3].old as any).id,
        spyGetCloudFlareRecordParametersValue,
      );
      expect(mockCloudFlareService.deleteEntry).toHaveBeenCalledTimes(2);
      deletions.forEach((deletion) => {
        const { id, zoneId } = deletion as unknown as DnsBaseCloudflareEntry;
        expect(mockCloudFlareService.deleteEntry).toHaveBeenCalledWith(
          id,
          zoneId,
        );
      });
      expect(mockConsoleLoggerService.debug).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          method: 'job',
          service: 'AppService',
          params: '[]',
        }),
      );
      expect(mockConsoleLoggerService.log).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.log).toHaveBeenCalledWith(
        `Synchronisation complete, entries changed: Added 4, Updated 4, Deleted 2, Unchanged 1`,
      );
    });

    describe('DDNS enabled', () => {
      const ddnsEntryOne = {
        name: 'test-ddns-1',
        type: DNSTypes.A,
        address: 'DDNS',
      } as unknown as DnsbaseEntry;
      const ddnsEntryOneExpected = {
        ...ddnsEntryOne,
        address: mockDdnsServiceGetIPAddressValue,
      };
      const ddnsEntryTwo = {
        name: 'test-ddns-2',
        type: DNSTypes.A,
        address: 'DDNS',
      } as unknown as DnsbaseEntry;
      const ddnsEntryTwoExpected = {
        ...ddnsEntryTwo,
        address: mockDdnsServiceGetIPAddressValue,
      };

      beforeEach(() => {
        mockDockerService.extractDNSEntries.mockReturnValue([
          ddnsEntryOne,
          ...mockDockerServiceExtractDNSEntriesValues,
          ddnsEntryTwo,
        ]);
        mockIsDnsAEntry.mockImplementation(
          (entry) => entry.type === DNSTypes.A,
        );
      });

      it('Should synchronize with DDNS, starting DDNS service', async () => {
        // arrange
        mockDdnsServiceIsDdnsRequiredValue = true;
        mockDdnsServiceGetStateValue = CronState.Stopped;

        // act
        await sut.job();

        // assert
        expect(mockDdnsService.getState).toHaveBeenCalledTimes(1);
        expect(mockDdnsService.start).toHaveBeenCalledTimes(1);
        expect(mockDdnsService.stop).not.toHaveBeenCalled();
        expect(mockDdnsService.getIPAddress).toHaveBeenCalledTimes(1);
        expect(mockAppFunctionsComputeSetDifference).toHaveBeenCalledWith(
          [
            ddnsEntryOneExpected,
            ...mockDockerServiceExtractDNSEntriesValues,
            ddnsEntryTwoExpected,
          ],
          expect.any(Array),
        );
      });

      it('Should syncrhonize with DDNS, but not start service if already started', async () => {
        // arrange
        mockDdnsServiceIsDdnsRequiredValue = true;
        mockDdnsServiceGetStateValue = CronState.Started;

        // act
        await sut.job();

        // assert
        expect(mockDdnsService.start).not.toHaveBeenCalled();
        expect(mockDdnsService.stop).not.toHaveBeenCalled();
        expect(mockDdnsService.getIPAddress).toHaveBeenCalledTimes(1);
        expect(mockAppFunctionsComputeSetDifference).toHaveBeenCalledWith(
          [
            ddnsEntryOneExpected,
            ...mockDockerServiceExtractDNSEntriesValues,
            ddnsEntryTwoExpected,
          ],
          expect.any(Array),
        );
      });

      it('Should stop synchronizing with DDNS if no longer required', async () => {
        // arrange
        mockDdnsServiceGetStateValue = CronState.Started;
        mockDdnsServiceIsDdnsRequiredValue = false;
        mockDockerService.extractDNSEntries.mockReturnValue(
          mockDockerServiceExtractDNSEntriesValues,
        );

        // act
        await sut.job();

        // assert
        expect(mockDdnsService.start).not.toHaveBeenCalled();
        expect(mockDdnsService.stop).toHaveBeenCalledTimes(1);
        expect(mockDdnsService.getIPAddress).not.toHaveBeenCalled();
        expect(mockAppFunctionsComputeSetDifference).toHaveBeenCalledWith(
          mockDockerServiceExtractDNSEntriesValues,
          expect.any(Array),
        );
      });

      it('Should filter out entries and post a warning if IPAddress is undefined', async () => {
        // arrange
        mockDdnsServiceIsDdnsRequiredValue = true;
        mockDdnsServiceGetStateValue = CronState.Started;
        mockDdnsService.getIPAddress.mockReturnValueOnce(undefined);

        // act
        await sut.job();

        // assert
        expect(mockDdnsService.getIPAddress).toHaveBeenCalledTimes(1);
        expect(mockAppFunctionsComputeSetDifference).toHaveBeenCalledWith(
          mockDockerServiceExtractDNSEntriesValues,
          expect.any(Array),
        );
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
          `DDNS, IPAddress has yet to be fetched successfully. DDNS records have been filtered out. 
          They'll be added in automatically once an IPAddress has been fetched.`,
        );
      });
    });
  });

  describe('private getFactoryForRecordParameters', () => {
    const paramZoneId = 'zone-id';
    const paramEntry = {} as DnsbaseEntry;

    beforeEach(() => {
      mockIsDnsAEntry.mockReturnValue(false);
      mockIsDnsCnameEntry.mockReturnValue(false);
      mockIsDnsMxEntry.mockReturnValue(false);
      mockIsDnsNsEntry.mockReturnValue(false);
    });

    it(`should invoke correct parameter factory for all types`, () => {
      [
        {
          mock: mockIsDnsAEntry,
          expected: mockCloudFlareFactoryCreateOrUpdateARecordParamsValue,
          called: mockCloudFlareFactory.createOrUpdateARecordParams,
          uncalled: [
            mockCloudFlareFactory.createOrUpdateCNAMERecordParams,
            mockCloudFlareFactory.createOrUpdateMXRecordParams,
            mockCloudFlareFactory.createOrUpdateNSRecordParams,
          ],
        },
        {
          mock: mockIsDnsCnameEntry,
          expected: mockCloudFlareFactoryCreateOrUpdateCNAMERecordParamsValue,
          called: mockCloudFlareFactory.createOrUpdateCNAMERecordParams,
          uncalled: [
            mockCloudFlareFactory.createOrUpdateARecordParams,
            mockCloudFlareFactory.createOrUpdateMXRecordParams,
            mockCloudFlareFactory.createOrUpdateNSRecordParams,
          ],
        },
        {
          mock: mockIsDnsMxEntry,
          expected: mockCloudFlareFactoryCreateOrUpdateMXRecordParamsValue,
          called: mockCloudFlareFactory.createOrUpdateMXRecordParams,
          uncalled: [
            mockCloudFlareFactory.createOrUpdateCNAMERecordParams,
            mockCloudFlareFactory.createOrUpdateARecordParams,
            mockCloudFlareFactory.createOrUpdateNSRecordParams,
          ],
        },
        {
          mock: mockIsDnsNsEntry,
          expected: mockCloudFlareFactoryCreateOrUpdateNSRecordParamsValue,
          called: mockCloudFlareFactory.createOrUpdateNSRecordParams,
          uncalled: [
            mockCloudFlareFactory.createOrUpdateCNAMERecordParams,
            mockCloudFlareFactory.createOrUpdateMXRecordParams,
            mockCloudFlareFactory.createOrUpdateARecordParams,
          ],
        },
      ].forEach(({ mock, expected, called, uncalled }) => {
        // arrange
        mock.mockReturnValueOnce(true);

        // act / assert
        expect(
          sut['getCloudFlareRecordParameters'](paramZoneId, paramEntry),
        ).toEqual(expected);
        expect(called).toHaveBeenCalledTimes(1);
        expect(called).toHaveBeenCalledWith(paramZoneId, paramEntry);
        uncalled.forEach((uncalledMock) => {
          expect(uncalledMock).not.toHaveBeenCalled();
        });
        expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'trace',
            method: 'getCloudFlareRecordParameters',
            service: 'AppService',
            params: `[ '${paramZoneId}', {} ]`,
          }),
        );

        // clean up
        jest.clearAllMocks();
      });
    });

    it('should error if type is unsupported', () => {
      // arrange
      const paramEntryInvalid = {
        ...paramEntry,
        type: DNSTypes.Unsupported,
      } as DnsbaseEntry;
      const expected = new Error(
        `AppService, getFactoryForRecordParameters: Unreachable error! No factory method available for Unsupported type. (type: ${paramEntryInvalid.type})`,
      );

      // act / assert
      expect(() =>
        sut['getCloudFlareRecordParameters'](paramZoneId, paramEntryInvalid),
      ).toThrow(expected);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'getCloudFlareRecordParameters',
          service: 'AppService',
          params: `[ '${paramZoneId}', { type: 'Unsupported' } ]`,
        }),
      );
    });
  });
});
