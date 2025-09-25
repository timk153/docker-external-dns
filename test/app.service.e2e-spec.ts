import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Cloudflare from 'cloudflare';
import { createMock } from '@golevelup/ts-jest';
import {
  Zone,
  ZonesV4PagePaginationArray,
} from 'cloudflare/resources/zones/zones';
import {
  ARecord,
  CNAMERecord,
  MXRecord,
  NSRecord,
  RecordsV4PagePaginationArray,
} from 'cloudflare/resources/dns/records';
import { PagePromise } from 'cloudflare/core';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { DNS } from 'cloudflare/resources';
import { DnsbaseEntry } from '../src/dto/dnsbase-entry';
import { DnsaEntry, isDnsAEntry } from '../src/dto/dnsa-entry';
import { DnsCnameEntry, isDnsCnameEntry } from '../src/dto/dnscname-entry';
import { DnsMxEntry, isDnsMxEntry } from '../src/dto/dnsmx-entry';
import { DnsNsEntry, isDnsNsEntry } from '../src/dto/dnsns-entry';
import { validDnsAEntry } from '../src/dto/dnsa-entry.spec';
import { validDnsCnameEntry } from '../src/dto/dnscname-entry.spec';
import { validDnsMxEntry } from '../src/dto/dnsmx-entry.spec';
import { validDnsNsEntry } from '../src/dto/dnsns-entry.spec';
import { AppModule } from '../src/app.module';
import { AppService } from '../src/app.service';
import { getConfigModuleImport } from '../src/app.configuration';

// mock cloudflare as integration doesn't want to invoke the real third party dependencies.
// instead, responses and calls to cloudflare will be mocked.
jest.mock('cloudflare');

const mockCloudflare = Cloudflare as jest.MockedClass<typeof Cloudflare>;

const label = 'docker-compose-external-dns:1';

/**
 * Converts Entity to CloudFlare value.
 * Used to seed test data for CLoudFlare mocks.
 * @param entity Entity to convert
 * @param id ID to set
 * @returns mock cloudflare entry
 */
function mapEntityToCloudFlare<T extends DnsbaseEntry>(
  entity: T,
  zone_id: string,
  id?: string,
  content?: string,
) {
  if (isDnsAEntry(entity)) {
    const { name, address, proxy } = entity;
    return {
      zone_id,
      id,
      name,
      type: 'A',
      proxied: proxy,
      content: content ?? address,
      comment: label,
    } as ARecord;
  }
  if (isDnsCnameEntry(entity)) {
    const { name, target, proxy } = entity;
    return {
      zone_id,
      id,
      name,
      type: 'CNAME',
      proxied: proxy,
      content: content ?? target,
      comment: label,
    } as CNAMERecord;
  }
  if (isDnsMxEntry(entity)) {
    const { name, server, priority } = entity;
    return {
      zone_id,
      id,
      name,
      type: 'MX',
      content: content ?? server,
      priority,
      comment: label,
    } as MXRecord;
  }
  if (isDnsNsEntry(entity)) {
    const { name, server } = entity;
    return {
      zone_id,
      id,
      name,
      type: 'NS',
      content: content ?? server,
      comment: label,
    } as NSRecord;
  }
  throw new Error('type not recognised');
}

describe('AppService (Integration)', () => {
  let app: INestApplication;
  let sut: AppService;
  let mockCloudflareInstance: jest.Mocked<Cloudflare>;

  type ZoneEntries = {
    created: DnsbaseEntry[];
    updated: DnsbaseEntry[];
    unchanged: DnsbaseEntry[];
    deleted: DNS.Record[];
  };
  let mockZoneOneEntries: ZoneEntries;
  let mockZoneTwoEntries: ZoneEntries;

  type TestContainerInstances = {
    'zone-1': {
      created: StartedTestContainer;
      updated: StartedTestContainer;
      unchanged: StartedTestContainer;
    };
    'zone-2': {
      created: StartedTestContainer;
      updated: StartedTestContainer;
      unchanged: StartedTestContainer;
    };
  };
  const containerInstances: TestContainerInstances = {
    'zone-1': {},
    'zone-2': {},
  } as unknown as TestContainerInstances;

  beforeAll(async () => {
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

    sut = app.get(AppService);
    sut.initialize();

    mockCloudflareInstance = mockCloudflare.mock
      .instances[0] as jest.Mocked<Cloudflare>;
    // --------- Cloudflare ---------
    // create mock for zones
    const mockCloudFlareZones = createMock<Cloudflare.Zones>();
    const mockZonePageTwo = {
      hasNextPage: jest.fn(() => false),
      getNextPage: jest.fn(),
      getPaginatedItems: jest.fn(() => [
        { id: 'zone-2', name: 'testdomain.org' } as Zone,
      ]),
    } as unknown as ZonesV4PagePaginationArray;
    const mockZonePageOne = {
      hasNextPage: jest.fn(() => true),
      getNextPage: jest.fn().mockResolvedValue(mockZonePageTwo),
      getPaginatedItems: jest.fn(() => [
        { id: 'zone-1', name: 'testdomain.com' } as Zone,
      ]),
    } as unknown as ZonesV4PagePaginationArray;
    mockCloudFlareZones.list.mockResolvedValue(mockZonePageOne);
    mockCloudflareInstance.zones = mockCloudFlareZones;
    // create mock for DNS records
    mockZoneOneEntries = {
      created: [
        validDnsAEntry(DnsaEntry, { name: 'a.created.testdomain.com' }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'cname.created.testdomain.com',
        }),
        validDnsMxEntry(DnsMxEntry, { name: 'mx.created.testdomain.com' }),
        validDnsNsEntry(DnsNsEntry, { name: 'ns.created.testdomain.com' }),
      ],
      updated: [
        validDnsAEntry(DnsaEntry, { name: 'a.updated.testdomain.com' }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'cname.updated.testdomain.com',
        }),
        validDnsMxEntry(DnsMxEntry, { name: 'mx.updated.testdomain.com' }),
        validDnsNsEntry(DnsNsEntry, { name: 'ns.updated.testdomain.com' }),
      ],
      deleted: [
        mapEntityToCloudFlare(
          validDnsAEntry(DnsaEntry, { name: 'a.delete.testdomain.com' }),
          'zone-1',
          'to-delete-1-1',
        ),
        mapEntityToCloudFlare(
          validDnsCnameEntry(DnsCnameEntry, {
            name: 'cname.delete.testdomain.com',
          }),
          'zone-1',
          'to-delete-1-2',
        ),
        mapEntityToCloudFlare(
          validDnsMxEntry(DnsMxEntry, { name: 'mx.delete.testdomain.com' }),
          'zone-1',
          'to-delete-1-3',
        ),
        mapEntityToCloudFlare(
          validDnsNsEntry(DnsNsEntry, { name: 'ns.delete.testdomain.com' }),
          'zone-1',
          'to-delete-1-4',
        ),
      ],
      unchanged: [
        validDnsAEntry(DnsaEntry, { name: 'a.unchanged.testdomain.com' }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'cname.unchanged.testdomain.com',
        }),
        validDnsMxEntry(DnsMxEntry, { name: 'mx.unchanged.testdomain.com' }),
        validDnsNsEntry(DnsNsEntry, { name: 'ns.unchanged.testdomain.com' }),
      ],
    };
    mockZoneTwoEntries = {
      created: [
        validDnsAEntry(DnsaEntry, { name: 'a.created.testdomain.org' }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'cname.created.testdomain.org',
        }),
        validDnsMxEntry(DnsMxEntry, { name: 'mx.created.testdomain.org' }),
        validDnsNsEntry(DnsNsEntry, { name: 'ns.created.testdomain.org' }),
      ],
      updated: [
        validDnsAEntry(DnsaEntry, { name: 'a.updated.testdomain.org' }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'cname.updated.testdomain.org',
        }),
        validDnsMxEntry(DnsMxEntry, { name: 'mx.updated.testdomain.org' }),
        validDnsNsEntry(DnsNsEntry, { name: 'ns.updated.testdomain.org' }),
      ],
      deleted: [
        mapEntityToCloudFlare(
          validDnsAEntry(DnsaEntry, { name: 'a.delete.testdomain.org' }),
          'zone-2',
          'to-delete-2-1',
        ),
        mapEntityToCloudFlare(
          validDnsCnameEntry(DnsCnameEntry, {
            name: 'cname.delete.testdomain.org',
          }),
          'zone-2',
          'to-delete-2-2',
        ),
        mapEntityToCloudFlare(
          validDnsMxEntry(DnsMxEntry, { name: 'mx.delete.testdomain.org' }),
          'zone-2',
          'to-delete-2-3',
        ),
        mapEntityToCloudFlare(
          validDnsNsEntry(DnsNsEntry, { name: 'ns.delete.testdomain.org' }),
          'zone-2',
          'to-delete-2-4',
        ),
      ],
      unchanged: [
        validDnsAEntry(DnsaEntry, { name: 'a.unchanged.testdomain.org' }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'cname.unchanged.testdomain.org',
        }),
        validDnsMxEntry(DnsMxEntry, { name: 'mx.unchanged.testdomain.org' }),
        validDnsNsEntry(DnsNsEntry, { name: 'ns.unchanged.testdomain.org' }),
      ],
    };

    const mockZoneOneRecordsPageThree = {
      hasNextPage: jest.fn(() => false),
      getNextPage: jest.fn(),
      getPaginatedItems: jest.fn(() => mockZoneOneEntries.deleted),
    } as unknown as RecordsV4PagePaginationArray;
    const mockZoneOneRecordsPageTwo = {
      hasNextPage: jest.fn(() => true),
      getNextPage: jest.fn().mockResolvedValue(mockZoneOneRecordsPageThree),
      getPaginatedItems: jest.fn(() =>
        mockZoneOneEntries.unchanged.map((entry) =>
          mapEntityToCloudFlare(entry, 'zone-1', entry.name),
        ),
      ),
    } as unknown as RecordsV4PagePaginationArray;
    const mockZoneOneRecordsPageOne = {
      hasNextPage: jest.fn(() => true),
      getNextPage: jest.fn().mockResolvedValue(mockZoneOneRecordsPageTwo),
      getPaginatedItems: jest.fn(() =>
        mockZoneOneEntries.updated.map((entry) =>
          mapEntityToCloudFlare(
            entry,
            'zone-1',
            entry.name,
            'old.testdomain.com',
          ),
        ),
      ),
    } as unknown as RecordsV4PagePaginationArray;
    const mockZoneTwoRecordsPageThree = {
      hasNextPage: jest.fn(() => false),
      getNextPage: jest.fn(),
      getPaginatedItems: jest.fn(() => mockZoneTwoEntries.deleted),
    } as unknown as RecordsV4PagePaginationArray;
    const mockZoneTwoRecordsPageTwo = {
      hasNextPage: jest.fn(() => true),
      getNextPage: jest.fn().mockResolvedValue(mockZoneTwoRecordsPageThree),
      getPaginatedItems: jest.fn(() =>
        mockZoneTwoEntries.unchanged.map((entry) =>
          mapEntityToCloudFlare(entry, 'zone-2', entry.name),
        ),
      ),
    } as unknown as RecordsV4PagePaginationArray;
    const mockZoneTwoRecordsPageOne = {
      hasNextPage: jest.fn(() => true),
      getNextPage: jest.fn().mockResolvedValue(mockZoneTwoRecordsPageTwo),
      getPaginatedItems: jest.fn(() =>
        mockZoneTwoEntries.updated.map((entry) =>
          mapEntityToCloudFlare(
            entry,
            'zone-2',
            entry.name,
            'old.testdomain.org',
          ),
        ),
      ),
    } as unknown as RecordsV4PagePaginationArray;
    const mockCloudFlareDnsRecords = createMock<Cloudflare.DNS.Records>();
    mockCloudFlareDnsRecords.list.mockImplementation(({ zone_id }) => {
      if (zone_id === 'zone-1')
        return Promise.resolve(
          mockZoneOneRecordsPageOne,
        ) as PagePromise<RecordsV4PagePaginationArray>;
      return Promise.resolve(
        mockZoneTwoRecordsPageOne,
      ) as PagePromise<RecordsV4PagePaginationArray>;
    });
    mockCloudflareInstance.dns = createMock<DNS>();
    mockCloudflareInstance.dns.records = mockCloudFlareDnsRecords;

    // --------- Docker ----------
    // Create containers with labels for zone-1
    const zoneOneCreatedPromise = new GenericContainer('busybox')
      .withName('ZoneOneCreated')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(mockZoneOneEntries.created),
      })
      .start();
    const zoneOneUpdatedPromise = new GenericContainer('busybox')
      .withName('ZoneOneUpdated')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(mockZoneOneEntries.updated),
      })
      .start();

    const zoneOneUnchangedPromise = new GenericContainer('busybox')
      .withName('ZoneOneUnchanged')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(mockZoneOneEntries.unchanged),
      })
      .start();

    containerInstances['zone-1'].created = await zoneOneCreatedPromise;
    containerInstances['zone-1'].updated = await zoneOneUpdatedPromise;
    containerInstances['zone-1'].unchanged = await zoneOneUnchangedPromise;
    // Create containers with labels for zone-2
    const zoneTwoCreatedPromise = new GenericContainer('busybox')
      .withName('ZoneTwoCreated')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(mockZoneTwoEntries.created),
      })
      .start();

    const zoneTwoUpdatedPromise = new GenericContainer('busybox')
      .withName('ZoneTwoUpdated')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(mockZoneTwoEntries.updated),
      })
      .start();

    const zoneTwoUnchangedPromise = new GenericContainer('busybox')
      .withName('ZoneTwoUnchanged')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(mockZoneTwoEntries.unchanged),
      })
      .start();

    containerInstances['zone-2'].created = await zoneTwoCreatedPromise;
    containerInstances['zone-2'].updated = await zoneTwoUpdatedPromise;
    containerInstances['zone-2'].unchanged = await zoneTwoUnchangedPromise;
  }, 300000);

  afterAll(async () => {
    await Promise.all([
      containerInstances['zone-1'].created.stop(),
      containerInstances['zone-1'].unchanged.stop(),
      containerInstances['zone-1'].updated.stop(),
      containerInstances['zone-2'].created.stop(),
      containerInstances['zone-2'].unchanged.stop(),
      containerInstances['zone-2'].updated.stop(),
    ]);
  }, 300000);

  it('should synchronize', async () => {
    // act
    await sut.job();

    // assert
    expect(mockCloudflareInstance.dns.records.create).toHaveBeenCalledTimes(8);
    [
      ...mockZoneOneEntries.created.map((entry) =>
        mapEntityToCloudFlare(entry, 'zone-1'),
      ),
      ...mockZoneTwoEntries.created.map((entry) =>
        mapEntityToCloudFlare(entry, 'zone-2'),
      ),
    ].forEach((entry) => {
      expect(mockCloudflareInstance.dns.records.create).toHaveBeenCalledWith(
        entry,
      );
    });
    expect(mockCloudflareInstance.dns.records.update).toHaveBeenCalledTimes(8);
    [
      ...mockZoneOneEntries.updated.map((entry) =>
        mapEntityToCloudFlare(entry, 'zone-1', entry.name),
      ),
      ...mockZoneTwoEntries.updated.map((entry) =>
        mapEntityToCloudFlare(entry, 'zone-2', entry.name),
      ),
    ].forEach((entry) => {
      const { id, ...rest } = entry;
      expect(mockCloudflareInstance.dns.records.update).toHaveBeenCalledWith(
        id,
        rest,
      );
    });
    expect(mockCloudflareInstance.dns.records.delete).toHaveBeenCalledTimes(8);
    mockZoneOneEntries.deleted.forEach(({ id }) => {
      expect(mockCloudflareInstance.dns.records.delete).toHaveBeenCalledWith(
        id,
        { zone_id: 'zone-1' },
      );
    });
    mockZoneTwoEntries.deleted.forEach(({ id }) => {
      expect(mockCloudflareInstance.dns.records.delete).toHaveBeenCalledWith(
        id,
        { zone_id: 'zone-2' },
      );
    });
  });
});
