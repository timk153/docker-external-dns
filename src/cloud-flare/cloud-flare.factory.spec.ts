import { Test, TestingModule } from '@nestjs/testing';
import { RecordCreateParams } from 'cloudflare/resources/dns/records';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { validDnsAEntry } from '../dto/dnsa-entry.spec';
import { DnsaEntry } from '../dto/dnsa-entry';
import { validDnsCnameEntry } from '../dto/dnscname-entry.spec';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { validDnsMxEntry } from '../dto/dnsmx-entry.spec';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { validDnsNsEntry } from '../dto/dnsns-entry.spec';
import { DnsNsEntry } from '../dto/dnsns-entry';
import { CloudFlareFactory } from './cloud-flare.factory';

describe('CloudFlareFactory', () => {
  let sut: CloudFlareFactory;
  const paramZoneId = 'zone-id';
  const paramEntryIdentifier = 'project-label:instance-id';

  let mockConfigService: DeepMocked<ConfigService>;
  const mockConfigServiceGetValues = {
    ENTRY_IDENTIFIER: paramEntryIdentifier,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudFlareFactory],
    })
      .useMocker(createMock)
      .compile();

    sut = module.get<CloudFlareFactory>(CloudFlareFactory);

    mockConfigService = module.get<ConfigService>(
      ConfigService,
    ) as DeepMocked<ConfigService>;
    mockConfigService.get.mockImplementation(
      (property) => mockConfigServiceGetValues[property],
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('should convert DnsAEntry to CloudFlare ARecord create params', () => {
    // arrange
    const param = validDnsAEntry(DnsaEntry);
    const expected: RecordCreateParams.ARecord = {
      zone_id: paramZoneId,
      type: 'A',
      name: param.name,
      content: param.address,
      proxied: param.proxy,
      comment: paramEntryIdentifier,
    };

    // act / assert
    expect(sut.createOrUpdateARecordParams(paramZoneId, param)).toEqual(
      expected,
    );
    expect(mockConfigService.get).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith('ENTRY_IDENTIFIER', {
      infer: true,
    });
  });

  it('should convert DnsCnameEntry to CloudFlare CNAMERecord create params', () => {
    // arrange
    const param = validDnsCnameEntry(DnsCnameEntry);
    const expected: RecordCreateParams.CNAMERecord = {
      zone_id: paramZoneId,
      type: 'CNAME',
      name: param.name,
      content: param.target,
      proxied: param.proxy,
      comment: paramEntryIdentifier,
    };

    // act / assert
    expect(sut.createOrUpdateCNAMERecordParams(paramZoneId, param)).toEqual(
      expected,
    );
    expect(mockConfigService.get).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith('ENTRY_IDENTIFIER', {
      infer: true,
    });
  });

  it('should convert DnsMxEntry to CloudFlare MXRecord create params', () => {
    // arrange
    const param = validDnsMxEntry(DnsMxEntry);
    const expected: RecordCreateParams.MXRecord = {
      zone_id: paramZoneId,
      type: 'MX',
      name: param.name,
      content: param.server,
      priority: param.priority,
      comment: paramEntryIdentifier,
    };

    // act / assert
    expect(sut.createOrUpdateMXRecordParams(paramZoneId, param)).toEqual(
      expected,
    );
    expect(mockConfigService.get).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith('ENTRY_IDENTIFIER', {
      infer: true,
    });
  });

  it('should convert DnsNSEntry to CloudFlare NSRecord create params', () => {
    // arrange
    const param = validDnsNsEntry(DnsNsEntry);
    const expected: RecordCreateParams.NSRecord = {
      zone_id: paramZoneId,
      type: 'NS',
      name: param.name,
      content: param.server,
      comment: paramEntryIdentifier,
    };

    // act / assert
    expect(sut.createOrUpdateNSRecordParams(paramZoneId, param)).toEqual(
      expected,
    );
    expect(mockConfigService.get).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith('ENTRY_IDENTIFIER', {
      infer: true,
    });
  });
});
