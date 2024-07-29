import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ContainerInfo } from 'dockerode';
import { Zone } from 'cloudflare/resources/zones/zones';
import { Record, RecordCreateParams } from 'cloudflare/resources/dns/records';
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
    'extracted-docker-entry-1',
    'extracted-docker-entry-2',
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
  } as { [key: number]: string };

  let mockCloudFlareService: DeepMocked<CloudFlareService>;
  let mockCloudFlareFactory: DeepMocked<CloudFlareFactory>;

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

    sut = module.get<AppService>(AppService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
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
      await expect(sut.synchronise()).rejects.toThrow(expected);
    });

    it('should synchronize', async () => {
      // act
      await sut.synchronise();

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
    });
  });
});
