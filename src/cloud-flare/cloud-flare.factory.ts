import { Injectable } from '@nestjs/common';
import {
  RecordCreateParams,
  RecordUpdateParams,
} from 'cloudflare/resources/dns/records';
import { ConfigService } from '@nestjs/config';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { DnsaEntry } from '../dto/dnsa-entry';
import { DnsNsEntry } from '../dto/dnsns-entry';

@Injectable()
export class CloudFlareFactory {
  constructor(private configService: ConfigService) {}

  createOrUpdateARecordParams(
    zoneId: string,
    { name, address, proxy }: DnsaEntry,
  ): RecordCreateParams.ARecord | RecordUpdateParams.ARecord {
    return {
      zone_id: zoneId,
      type: 'A',
      name,
      content: address,
      proxied: proxy,
      comment: this.configService.get('ENTRY_IDENTIFIER', { infer: true }),
    };
  }

  createOrUpdateCNAMERecordParams(
    zoneId: string,
    { name, target, proxy }: DnsCnameEntry,
  ): RecordCreateParams.CNAMERecord | RecordUpdateParams.CNAMERecord {
    return {
      zone_id: zoneId,
      type: 'CNAME',
      name,
      content: target,
      proxied: proxy,
      comment: this.configService.get('ENTRY_IDENTIFIER', { infer: true }),
    };
  }

  createOrUpdateMXRecordParams(
    zoneId: string,
    { name, server, priority }: DnsMxEntry,
  ): RecordCreateParams.MXRecord | RecordUpdateParams.MXRecord {
    return {
      zone_id: zoneId,
      type: 'MX',
      name,
      content: server,
      priority,
      comment: this.configService.get('ENTRY_IDENTIFIER', { infer: true }),
    };
  }

  createOrUpdateNSRecordParams(
    zoneId: string,
    { name, server }: DnsNsEntry,
  ): RecordCreateParams.NSRecord | RecordUpdateParams.NSRecord {
    return {
      zone_id: zoneId,
      type: 'NS',
      name,
      content: server,
      comment: this.configService.get('ENTRY_IDENTIFIER', { infer: true }),
    };
  }
}
