import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Cloudflare from 'cloudflare';
import { Zone } from 'cloudflare/resources/zones/zones';
import {
  ARecord,
  CNAMERecord,
  MXRecord,
  NSRecord,
  Record,
  RecordCreateParams,
  RecordUpdateParams,
} from 'cloudflare/resources/dns/records';
import { DnsaCloudflareEntry } from '../dto/dnsa-cloudflare-entry';
import { DnsCnameCloudflareEntry } from '../dto/dnscname-cloudflare-entry';
import { DnsMxCloudflareEntry } from '../dto/dnsmx-cloudflare-entry';
import { DnsNsCloudflareEntry } from '../dto/dnsns-cloudflare-entry';
import { DnsUnsupportedCloudFlareEntry } from '../dto/dnsunsupported-cloudflare-entry';
import { DnsbaseEntry, DNSTypes, ICloudFlareEntry } from '../dto/dnsbase-entry';
import { NestedError } from '../errors/nested-error';

/**
 * Possible states of the CloudFlare service
 */
export enum State {
  Uninitialized,
  Initialized,
}

@Injectable()
export class CloudFlareService {
  private logger = new Logger(CloudFlareService.name);

  private state: State = State.Uninitialized;

  private cloudFlare: Cloudflare;

  constructor(private configService: ConfigService) {}

  initialize() {
    if (this.state === State.Initialized)
      throw Error(
        'CloudFlareService, initialize: Already initialized, but attempted to initialize again',
      );

    this.cloudFlare = new Cloudflare({
      apiToken: this.configService.get('API_TOKEN', { infer: true }),
    });

    this.state = State.Initialized;
  }

  async getZones(): Promise<Zone[]> {
    if (this.state === State.Uninitialized)
      throw Error(
        'CloudFlareService, getZones: Not initialized, call initialize first',
      );

    try {
      let result: Zone[] = [];
      let paginatedResult = await this.cloudFlare.zones.list();
      result = [...result, ...paginatedResult.getPaginatedItems()];
      while (paginatedResult.hasNextPage()) {
        /* This rule is intentionally disabled:
         *
         * It's a performance based rule which says you should dispatch all async
         * calls at once rather than awaiting within a loop which causes them to run
         * sequentially.
         *
         * In our case as the async is exposed via method calls it's not possible
         * to execute them all and wait using Promise.all.
         *
         * Recursion would solve this but not improve performance and make testing
         * harder.
         *
         * Hence disabling the rule.
         */
        // eslint-disable-next-line no-await-in-loop
        paginatedResult = await paginatedResult.getNextPage();
        result = [...result, ...paginatedResult.getPaginatedItems()];
      }
      return result;
    } catch (error) {
      throw new NestedError(
        'CloudFlareService, getZones: Error fetching Zones from CloudFlare',
        error,
      );
    }
  }

  getZoneForEntry(
    zones: Zone[],
    entry: DnsbaseEntry,
  ): { isSuccessful: boolean; zone?: Zone } {
    const result = zones.find(({ name }) => entry.name.endsWith(name));
    if (result === undefined) {
      this.logger.warn(
        `CloudFlareService, getZoneForEntry: No zone found for entry. (name: "${entry.name}", zones: "${JSON.stringify(zones.map((zone) => zone.name))}")`,
      );
      return { isSuccessful: false };
    }
    return { isSuccessful: true, zone: result };
  }

  async getDNSEntries(zoneId: string): Promise<Cloudflare.DNS.Record[]> {
    if (this.state === State.Uninitialized)
      throw Error(
        'CloudFlareService, getDNSEntries: Not initialized, call initialize first',
      );

    try {
      let result: Record[] = [];
      let paginatedResult = await this.cloudFlare.dns.records.list({
        zone_id: zoneId,
        comment: {
          exact: this.configService.get('ENTRY_IDENTIFIER', { infer: true }),
        },
      });
      result = [...result, ...paginatedResult.getPaginatedItems()];
      while (paginatedResult.hasNextPage()) {
        /* This rule is intentionally disabled:
         *
         * It's a performance based rule which says you should dispatch all async
         * calls at once rather than awaiting within a loop which causes them to run
         * sequentially.
         *
         * In our case as the async is exposed via method calls it's not possible
         * to execute them all and wait using Promise.all.
         *
         * Recursion would solve this but not improve performance and make testing
         * harder.
         *
         * Hence disabling the rule.
         */
        // eslint-disable-next-line no-await-in-loop
        paginatedResult = await paginatedResult.getNextPage();
        result = [...result, ...paginatedResult.getPaginatedItems()];
      }
      return result;
    } catch (error) {
      throw new NestedError(
        'CloudFlareService, getDNSEntries: Error fetching DNS records from CloudFlare',
        error,
      );
    }
  }

  /**
   * Maps the CloudFlare DNS Records to the common DnsBaseCloudflareEntry type
   * @param {string} zoneId ID of the CloudFlare Zone these records were loaded from
   * @param {Cloudflare.DNS.Record[]} entries DNS entries from CloudFlare
   * @returns {ICloudFlareEntry[]} Entries transformed into DnsBaseCloudflareEntry entries
   */
  mapDNSEntries(
    zoneId: string,
    entries: Cloudflare.DNS.Record[],
  ): ICloudFlareEntry[] {
    return entries.map((cloudFlareEntry) => {
      let result: ICloudFlareEntry;
      switch (cloudFlareEntry.type) {
        case 'A': {
          const { content, proxied } = cloudFlareEntry as ARecord;
          const entry = new DnsaCloudflareEntry();
          entry.address = content;
          entry.proxy = proxied as boolean;
          entry.type = DNSTypes.A;
          result = entry;
          break;
        }
        case 'CNAME': {
          const { content, proxied } = cloudFlareEntry as CNAMERecord;
          const entry = new DnsCnameCloudflareEntry();
          entry.target = content as string;
          entry.proxy = proxied as boolean;
          entry.type = DNSTypes.CNAME;
          result = entry;
          break;
        }
        case 'MX': {
          const { content, priority } = cloudFlareEntry as MXRecord;
          const entry = new DnsMxCloudflareEntry();
          entry.server = content;
          entry.priority = priority;
          entry.type = DNSTypes.MX;
          result = entry;
          break;
        }
        case 'NS': {
          const { content } = cloudFlareEntry as NSRecord;
          const entry = new DnsNsCloudflareEntry();
          entry.server = content;
          entry.type = DNSTypes.NS;
          result = entry;
          break;
        }
        default: {
          const entry = new DnsUnsupportedCloudFlareEntry();
          entry.type = DNSTypes.Unsupported;
          result = entry;
          this.logger
            .warn(`CloudFlareService, mapDNSEntries: Unsupported entry with id ${cloudFlareEntry.id} found. 
            It will be DELETED. Do not add the tracking comment to other DNS entries in CloudFlare!`);
        }
      }
      const { id, name } = cloudFlareEntry;
      result.id = id as string;
      result.name = name;
      result.zoneId = zoneId;
      return result;
    });
  }

  async createEntry(
    entry:
      | RecordCreateParams.ARecord
      | RecordCreateParams.CNAMERecord
      | RecordCreateParams.MXRecord
      | RecordCreateParams.NSRecord,
  ): Promise<void> {
    try {
      await this.cloudFlare.dns.records.create(entry);
    } catch (error) {
      throw new NestedError(
        `CloudFlareService, createEntry: Cloudflare errored creating entry. (${JSON.stringify(entry)})`,
        error,
      );
    }
  }

  async updateEntry(
    recordId: string,
    entry:
      | RecordUpdateParams.ARecord
      | RecordUpdateParams.CNAMERecord
      | RecordUpdateParams.MXRecord
      | RecordUpdateParams.NSRecord,
  ): Promise<void> {
    try {
      await this.cloudFlare.dns.records.update(recordId, entry);
    } catch (error) {
      throw new NestedError(
        `CloudFlareService, createEntry: Cloudflare errored updating entry. (${JSON.stringify(entry)})`,
        error,
      );
    }
  }

  async deleteEntry(recordId: string, zoneId: string): Promise<void> {
    try {
      await this.cloudFlare.dns.records.delete(recordId, { zone_id: zoneId });
    } catch (error) {
      throw new NestedError(
        `CloudFlareService, createEntry: Cloudflare errored deleting entry. (zone_id: ${zoneId}, dnsRecordId: ${recordId})`,
        error,
      );
    }
  }
}
