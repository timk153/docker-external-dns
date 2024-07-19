import { Test, TestingModule } from '@nestjs/testing';
import Cloudflare from 'cloudflare';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import {
  AAAARecord,
  ARecord,
  CAARecord,
  CERTRecord,
  CNAMERecord,
  DNSKEYRecord,
  DSRecord,
  HTTPSRecord,
  LOCRecord,
  MXRecord,
  NAPTRRecord,
  NSRecord,
  PTRRecord,
  Record,
  RecordsV4PagePaginationArray,
  SMIMEARecord,
  SRVRecord,
  SSHFPRecord,
  SVCBRecord,
  TLSARecord,
  TXTRecord,
  URIRecord,
} from 'cloudflare/resources/dns/records';
import {
  Zone,
  ZonesV4PagePaginationArray,
} from 'cloudflare/resources/zones/zones';
import { Logger } from '@nestjs/common';
import { validDnsAEntry } from '../dto/dnsa-entry.spec';
import { validDnsCnameEntry } from '../dto/dnscname-entry.spec';
import { validDnsMxEntry } from '../dto/dnsmx-entry.spec';
import { validDnsNsEntry } from '../dto/dnsns-entry.spec';
import { DnsUnsupportedCloudFlareEntry } from '../dto/dnsunsupported-cloudflare-entry';
import { DNSTypes } from '../dto/dnsbase-entry';
import { DnsaCloudflareEntry } from '../dto/dnsa-cloudflare-entry';
import { DnsCnameCloudflareEntry } from '../dto/dnscname-cloudflare-entry';
import { DnsMxCloudflareEntry } from '../dto/dnsmx-cloudflare-entry';
import { DnsNsCloudflareEntry } from '../dto/dnsns-cloudflare-entry';
import { CloudFlareService, State } from './cloud-flare.service';
import { NestedError } from '../errors/nested-error';

jest.mock('cloudflare');
jest.mock('@nestjs/common', () => {
  const mock = jest.createMockFromModule('@nestjs/common') as any;
  const actual = jest.requireActual('@nestjs/common');

  return { ...actual, Logger: mock.Logger };
});

const mockCloudflare = Cloudflare as jest.MockedClass<typeof Cloudflare>;

/**
 * Builds CloudFlareDNSRecords for testing
 */
class CloudFlareDNSRecordBuilder<T extends Cloudflare.DNS.Records.Record> {
  private result?: DeepMocked<Cloudflare.DNS.Records.Record>;

  private name?: string;

  private content?: string;

  private proxied?: boolean;

  private priority?: number;

  private typeId?: string;

  constructor() {
    this.result = {} as T;
  }

  WithType(pTypeId: string) {
    this.typeId = pTypeId;
    return this;
  }

  WithName(pName: string) {
    this.name = pName;
    return this;
  }

  WithContent(pContent: string) {
    this.content = pContent;
    return this;
  }

  WithProxied(pProxied: boolean) {
    this.proxied = pProxied;
    return this;
  }

  WithPriority(pPriority: number) {
    this.priority = pPriority;
    return this;
  }

  Build(): DeepMocked<T> {
    if (this.result === undefined || this.name === undefined)
      throw new Error(
        'CloudFlareDNSRecordBuilder, invalid recipe. Check caller',
      );

    this.result.id = `${this.typeId}-id`;
    this.result.type = this.typeId as any;
    this.result.name = this.name;
    if (this.content !== undefined) this.result.content = this.content;

    const resultAsMX = this.result as DeepMocked<MXRecord>;
    const resultAsProxiable = this.result as DeepMocked<ARecord | CNAMERecord>;

    if (this.priority !== undefined) resultAsMX.priority = this.priority;
    if (this.proxied !== undefined) resultAsProxiable.proxied = this.proxied;

    const toReturn = this.result;

    this.result = undefined;
    this.typeId = undefined;
    this.name = undefined;
    this.content = undefined;
    this.proxied = undefined;
    this.priority = undefined;

    return toReturn as DeepMocked<T>;
  }
}

describe('CloudFlareService', () => {
  let sut: CloudFlareService;
  let mockConfigService: DeepMocked<ConfigService>;
  const mockConfigServiceGetValues = {
    API_TOKEN: 'api-token',
    PROJECT_LABEL: 'project-label',
    INSTANCE_ID: 'instance-id',
  };

  let mockLogger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudFlareService],
    })
      .useMocker(createMock)
      .compile();

    sut = module.get<CloudFlareService>(CloudFlareService);

    mockConfigService = module.get<ConfigService>(
      ConfigService,
    ) as DeepMocked<ConfigService>;
    mockConfigService.get.mockImplementation(
      (property) => mockConfigServiceGetValues[property],
    );

    mockLogger = sut['logger'];
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('initialize', () => {
    it('should error if initialized', () => {
      // arrange
      const expected = new Error(
        'CloudFlareService, initialize: Already initialized, but attempted to initialize again',
      );
      sut['state'] = State.Initialized;

      // act / assert
      expect(() => sut.initialize()).toThrow(expected);
      expect(sut['state']).toBe(State.Initialized);
    });

    it('should initialize cloudflare and set state to initialized', () => {
      // arrange
      sut['state'] = State.Uninitialized;

      // act
      sut.initialize();

      // assert
      expect(mockConfigService.get).toHaveBeenCalledTimes(1);
      expect(mockConfigService.get).toHaveBeenCalledWith('API_TOKEN', {
        infer: true,
      });
      expect(mockCloudflare).toHaveBeenCalledTimes(1);
      expect(mockCloudflare).toHaveBeenCalledWith({
        apiToken: mockConfigServiceGetValues.API_TOKEN,
      });
      expect(sut['state']).toBe(State.Initialized);
    });
  });

  describe('getZones', () => {
    let mockCloudFlareInstance: DeepMocked<Cloudflare>;
    let mockZones: DeepMocked<Cloudflare.Zones>;

    beforeEach(() => {
      sut['state'] = State.Initialized;
      const mockCloudflareInstance = new Cloudflare();
      mockCloudflareInstance.zones = createMock<Cloudflare.Zones>();
      sut['cloudFlare'] = mockCloudflareInstance;
      mockCloudFlareInstance = sut['cloudFlare'] as DeepMocked<Cloudflare>;
      mockZones = mockCloudFlareInstance.zones as DeepMocked<Cloudflare.Zones>;
    });

    it('should error if not initialized', async () => {
      // arrange
      const expected = new Error(
        'CloudFlareService, getZones: Not initialized, call initialize first',
      );
      sut['state'] = State.Uninitialized;

      // act / assert
      await expect(sut.getZones()).rejects.toThrow(expected);
    });

    it('should error if cloudflare throws', async () => {
      // arrange
      const error = new Error('Call failed');
      const expected = new NestedError(
        'CloudFlareService, getZones: Error fetching Zones from CloudFlare',
        error,
      );

      mockZones.list.mockRejectedValueOnce(error);

      // act / assert
      await expect(sut.getZones()).rejects.toThrow(expected);
    });

    it('should return DNS zones', async () => {
      // arrange
      const mockResults = [
        'result' as unknown as Zone,
        'result1' as unknown as Zone,
      ];
      const mockZoneListValue = {
        hasNextPage: jest.fn(() => false),
        getNextPage: jest.fn(),
        getPaginatedItems: jest.fn(() => mockResults),
      } as unknown as ZonesV4PagePaginationArray;

      mockZones.list.mockResolvedValue(mockZoneListValue);

      // act
      const result = await sut.getZones();

      // assert
      expect(mockZones.list).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue.getNextPage).not.toHaveBeenCalled();
      expect(mockZoneListValue.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResults);
    });

    it('should return paginated DNS zones', async () => {
      // arrange
      const mockResults = {
        1: ['result' as unknown as Zone, 'result1' as unknown as Zone],
        2: ['result2' as unknown as Zone, 'result3' as unknown as Zone],
        3: ['result4' as unknown as Zone, 'result5' as unknown as Zone],
      };

      const mockZoneListValue3 = {
        hasNextPage: jest.fn(() => false),
        getNextPage: jest.fn(),
        getPaginatedItems: jest.fn(() => mockResults[3]),
      } as unknown as ZonesV4PagePaginationArray;
      const mockZoneListValue2 = {
        hasNextPage: jest.fn(() => true),
        getNextPage: jest.fn().mockResolvedValue(mockZoneListValue3),
        getPaginatedItems: jest.fn(() => mockResults[2]),
      } as unknown as ZonesV4PagePaginationArray;
      const mockZoneListValue1 = {
        hasNextPage: jest.fn(() => true),
        getNextPage: jest.fn().mockResolvedValue(mockZoneListValue2),
        getPaginatedItems: jest.fn(() => mockResults[1]),
      } as unknown as ZonesV4PagePaginationArray;

      mockZones.list.mockResolvedValueOnce(mockZoneListValue1);

      // act
      const result = await sut.getZones();

      // assert
      expect(mockZones.list).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue1.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue1.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue1.getNextPage).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue2.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue2.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue2.getNextPage).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue3.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue3.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockZoneListValue3.getNextPage).not.toHaveBeenCalled();
      expect(result).toEqual([
        ...mockResults[1],
        ...mockResults[2],
        ...mockResults[3],
      ]);
    });
  });

  describe('getDNSEntries', () => {
    const paramZoneId = 'zone-id';
    let mockCloudFlareInstance: DeepMocked<Cloudflare>;
    let mockRecords: DeepMocked<Cloudflare.DNS.Records>;

    beforeEach(() => {
      sut['state'] = State.Initialized;
      const mockCloudflareInstance = new Cloudflare();
      mockCloudflareInstance.dns = {
        records: createMock<Cloudflare.DNS.Records>(),
      } as unknown as Cloudflare.DNS;
      sut['cloudFlare'] = mockCloudflareInstance;
      mockCloudFlareInstance = sut['cloudFlare'] as DeepMocked<Cloudflare>;
      mockRecords = mockCloudFlareInstance.dns
        .records as DeepMocked<Cloudflare.DNS.Records>;
    });

    it('should error if not initialized', async () => {
      // arrange
      const expected = new Error(
        'CloudFlareService, getDNSEntries: Not initialized, call initialize first',
      );
      sut['state'] = State.Uninitialized;

      // act / assert
      await expect(sut.getDNSEntries(paramZoneId)).rejects.toThrow(expected);
    });

    it('should error if cloudflare throws', async () => {
      // arrange
      const error = new Error('Call failed');
      const expected = new NestedError(
        'CloudFlareService, getDNSEntries: Error fetching DNS records from CloudFlare',
        error,
      );

      mockRecords.list.mockRejectedValueOnce(error);

      // act / assert
      await expect(sut.getDNSEntries(paramZoneId)).rejects.toThrow(expected);
    });

    it('should return dns records', async () => {
      // arrange
      const mockResults = [
        'result' as unknown as ARecord,
        'result1' as unknown as ARecord,
      ];
      const mockRecordListValue = {
        hasNextPage: jest.fn(() => false),
        getNextPage: jest.fn(),
        getPaginatedItems: jest.fn(() => mockResults),
      } as unknown as RecordsV4PagePaginationArray;

      const { PROJECT_LABEL, INSTANCE_ID } = mockConfigServiceGetValues;
      mockRecords.list.mockResolvedValue(mockRecordListValue);

      // act
      const result = await sut.getDNSEntries(paramZoneId);

      // assert
      expect(mockRecords.list).toHaveBeenCalledTimes(1);
      expect(mockRecords.list).toHaveBeenCalledWith({
        zone_id: paramZoneId,
        comment: {
          exact: `${PROJECT_LABEL}:${INSTANCE_ID}`,
        },
      });
      expect(mockRecordListValue.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue.getNextPage).not.toHaveBeenCalled();
      expect(mockRecordListValue.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResults);
    });

    it('should return paginated dns records', async () => {
      // arrange
      const mockResults = {
        1: ['result' as unknown as ARecord, 'result1' as unknown as ARecord],
        2: ['result2' as unknown as ARecord, 'result3' as unknown as ARecord],
        3: ['result4' as unknown as ARecord, 'result5' as unknown as ARecord],
      };

      const mockRecordListValue3 = {
        hasNextPage: jest.fn(() => false),
        getNextPage: jest.fn(),
        getPaginatedItems: jest.fn(() => mockResults[3]),
      } as unknown as RecordsV4PagePaginationArray;
      const mockRecordListValue2 = {
        hasNextPage: jest.fn(() => true),
        getNextPage: jest.fn().mockResolvedValue(mockRecordListValue3),
        getPaginatedItems: jest.fn(() => mockResults[2]),
      } as unknown as RecordsV4PagePaginationArray;
      const mockRecordListValue1 = {
        hasNextPage: jest.fn(() => true),
        getNextPage: jest.fn().mockResolvedValue(mockRecordListValue2),
        getPaginatedItems: jest.fn(() => mockResults[1]),
      } as unknown as RecordsV4PagePaginationArray;

      mockRecords.list.mockResolvedValueOnce(mockRecordListValue1);

      // act
      const result = await sut.getDNSEntries(paramZoneId);

      // assert
      expect(mockRecords.list).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue1.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue1.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue1.getNextPage).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue2.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue2.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue2.getNextPage).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue3.getPaginatedItems).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue3.hasNextPage).toHaveBeenCalledTimes(1);
      expect(mockRecordListValue3.getNextPage).not.toHaveBeenCalled();
      expect(result).toEqual([
        ...mockResults[1],
        ...mockResults[2],
        ...mockResults[3],
      ]);
    });

    describe('mapDNSEntries', () => {
      // supported records
      const mockDNSAEntry = validDnsAEntry(DnsaCloudflareEntry);
      const mockCloudFlareARecord = new CloudFlareDNSRecordBuilder<ARecord>()
        .WithType('A')
        .WithName(mockDNSAEntry.name)
        .WithContent(mockDNSAEntry.address)
        .WithProxied(mockDNSAEntry.proxy)
        .Build();
      mockDNSAEntry.id = mockCloudFlareARecord.id as string;
      const mockDNSCNAMEEntry = validDnsCnameEntry(DnsCnameCloudflareEntry);
      const mockCloudFlareCNAMERecord =
        new CloudFlareDNSRecordBuilder<CNAMERecord>()
          .WithType('CNAME')
          .WithName(mockDNSCNAMEEntry.name)
          .WithContent(mockDNSCNAMEEntry.target)
          .WithProxied(mockDNSCNAMEEntry.proxy)
          .Build();
      mockDNSCNAMEEntry.id = mockCloudFlareCNAMERecord.id as string;
      const mockDNSMXEntry = validDnsMxEntry(DnsMxCloudflareEntry);
      const mockCloudFlareMXRecord = new CloudFlareDNSRecordBuilder<MXRecord>()
        .WithType('MX')
        .WithName(mockDNSMXEntry.name)
        .WithContent(mockDNSMXEntry.server)
        .WithPriority(mockDNSMXEntry.priority)
        .Build();
      mockDNSMXEntry.id = mockCloudFlareMXRecord.id as string;
      const mockDNSNSEntry = validDnsNsEntry(DnsNsCloudflareEntry);
      const mockCloudFlareNSRecord = new CloudFlareDNSRecordBuilder<NSRecord>()
        .WithType('NS')
        .WithName(mockDNSNSEntry.name)
        .WithContent(mockDNSNSEntry.server)
        .Build();
      mockDNSNSEntry.id = mockCloudFlareNSRecord.id as string;

      it('should deserialize successfully', () => {
        // arrange
        const mockDNSEntries: { id: string; name: string; type: DNSTypes }[] = [
          mockDNSAEntry,
          mockDNSCNAMEEntry,
          mockDNSMXEntry,
          mockDNSNSEntry,
        ];
        const mockCloudFlareEntries: DeepMocked<Record>[] = [
          mockCloudFlareARecord,
          mockCloudFlareCNAMERecord,
          mockCloudFlareMXRecord,
          mockCloudFlareNSRecord,
        ];
        const warnMessages: string[] = [];

        const unsupportedEntryFactory = <T extends Record>(typeId: string) => {
          const mockCloudFlareEntry = new CloudFlareDNSRecordBuilder<T>()
            .WithType(typeId)
            .WithName('unsupported')
            .WithContent('to-be-ignored')
            .Build();

          const mockDNSEntry = new DnsUnsupportedCloudFlareEntry();
          mockDNSEntry.id = mockCloudFlareEntry.id as string;
          mockDNSEntry.name = mockCloudFlareEntry.name;
          mockDNSEntry.type = DNSTypes.Unsupported;

          mockCloudFlareEntries.push(mockCloudFlareEntry);
          mockDNSEntries.push(mockDNSEntry);
          warnMessages.push(
            `CloudFlareService, mapDNSEntries: Unsupported entry with id ${mockCloudFlareEntry.id} found. 
            It will be DELETED. Do not add the tracking comment to other DNS entries in CloudFlare!`,
          );
        };

        // create mocked unsupported entries
        unsupportedEntryFactory<AAAARecord>('AAAA');
        unsupportedEntryFactory<CAARecord>('CAA');
        unsupportedEntryFactory<CERTRecord>('CERT');
        unsupportedEntryFactory<DNSKEYRecord>('DNSKEY');
        unsupportedEntryFactory<DSRecord>('DS');
        unsupportedEntryFactory<HTTPSRecord>('HTTPS');
        unsupportedEntryFactory<LOCRecord>('LOC');
        unsupportedEntryFactory<NAPTRRecord>('NAPTR');
        unsupportedEntryFactory<PTRRecord>('PTR');
        unsupportedEntryFactory<SMIMEARecord>('SMIMEA');
        unsupportedEntryFactory<SRVRecord>('SRV');
        unsupportedEntryFactory<SSHFPRecord>('SSHFP');
        unsupportedEntryFactory<SVCBRecord>('SVCB');
        unsupportedEntryFactory<TLSARecord>('TLSA');
        unsupportedEntryFactory<TXTRecord>('TXT');
        unsupportedEntryFactory<URIRecord>('URI');

        // act
        const result = sut.mapDNSEntries(mockCloudFlareEntries);

        // assert
        expect(result).toEqual(mockDNSEntries);
        expect(mockLogger.warn).toHaveBeenCalledTimes(warnMessages.length);
        warnMessages.forEach((message) => {
          expect(mockLogger.warn).toHaveBeenCalledWith(message);
        });
      });
    });
  });
});
