import { Injectable } from '@nestjs/common';
import {
  RecordCreateParams,
  RecordUpdateParams,
} from 'cloudflare/resources/dns/records';
import { ConfigService } from '@nestjs/config';
import { ConsoleLoggerService } from '../logger.service';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { DnsaEntry } from '../dto/dnsa-entry';
import { DnsNsEntry } from '../dto/dnsns-entry';
import { getLogClassDecorator } from '../utility.functions';

let loggerPointer: ConsoleLoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

/**
 * Object creation for CloudFlare data transfer objects.
 * Maps from internal business object types to cloudlfare types.
 */
@LogDecorator()
@Injectable()
export class CloudFlareFactory {
  constructor(
    private configService: ConfigService,
    private loggerService: ConsoleLoggerService,
  ) {
    loggerPointer = this.loggerService;
  }

  /**
   * Creates an A Record Parameter object.
   * Required when creating or updating an A Record on CloudFlare.
   * @param zoneId The zone this parameter object will be associated with
   * @param param1 The DnsAEntry that represents this CloudFlare entry.
   * @returns The associated CloudFlare business object
   */
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
      comment: this.configService.get<string>('ENTRY_IDENTIFIER', {
        infer: true,
      }),
    };
  }

  /**
   * Creates a CNAME Record Parameter object.
   * Required when creating or updating an CNAME Record on CloudFlare.
   * @param zoneId The zone this parameter object will be associated with
   * @param param1 The DnsCnameEntry that represents this CloudFlare entry.
   * @returns The associated CloudFlare business object
   */
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
      comment: this.configService.get<string>('ENTRY_IDENTIFIER', {
        infer: true,
      }),
    };
  }

  /**
   * Creates a MX Record Parameter object.
   * Required when creating or updating an MX Record on CloudFlare.
   * @param zoneId The zone this parameter object will be associated with
   * @param param1 The DnsMxEntry that represents this CloudFlare entry.
   * @returns The associated CloudFlare business object
   */
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
      comment: this.configService.get<string>('ENTRY_IDENTIFIER', {
        infer: true,
      }),
    };
  }

  /**
   * Creates a NS Record Parameter object.
   * Required when creating or updating an NS Record on CloudFlare.
   * @param zoneId The zone this parameter object will be associated with
   * @param param1 The DnsNsEntry that represents this CloudFlare entry.
   * @returns The associated CloudFlare business object
   */
  createOrUpdateNSRecordParams(
    zoneId: string,
    { name, server }: DnsNsEntry,
  ): RecordCreateParams.NSRecord | RecordUpdateParams.NSRecord {
    return {
      zone_id: zoneId,
      type: 'NS',
      name,
      content: server,
      comment: this.configService.get<string>('ENTRY_IDENTIFIER', {
        infer: true,
      }),
    };
  }
}
