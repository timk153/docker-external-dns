import { Injectable, LoggerService } from '@nestjs/common';
import { Record } from 'cloudflare/resources/dns/records';
import { CloudFlareService } from './cloud-flare/cloud-flare.service';
import { CloudFlareFactory } from './cloud-flare/cloud-flare.factory';
import { DockerService } from './docker/docker.service';
import { computeSetDifference } from './app.functions';
import { DnsbaseEntry } from './dto/dnsbase-entry';
import { isDnsAEntry } from './dto/dnsa-entry';
import { isDnsCnameEntry } from './dto/dnscname-entry';
import { isDnsMxEntry } from './dto/dnsmx-entry';
import { isDnsNsEntry } from './dto/dnsns-entry';
import { getLogClassDecorator } from './utility.functions';
import { ConsoleLoggerService } from './logger.service';

let loggerPointer: LoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

/**
 * Possible states of AppService
 */
export enum State {
  Uninitialized,
  Initialized,
}

/**
 * Behaviors to initialize the applications services and execute the synchronization between
 * the docker labels and CloudFlare.
 */
@LogDecorator()
@Injectable()
export class AppService {
  private state = State.Uninitialized;

  constructor(
    private cloudFlareService: CloudFlareService,
    private cloudFlareFactory: CloudFlareFactory,
    private dockerService: DockerService,
    private loggerService: ConsoleLoggerService,
  ) {
    loggerPointer = this.loggerService;
  }

  /**
   * Initialize AppService.
   * Initializes CloudFlare and Docker services
   */
  initialize() {
    this.cloudFlareService.initialize();
    this.dockerService.initialize();
    this.state = State.Initialized;
  }

  /**
   * Fetches labels from docker.
   * Fetches records from CloudFlare.
   * Computes additions, updates, deletions and unchanged.
   * Adds, Updates and Deletes entries from CloudFlare.
   */
  async synchronise() {
    if (this.state === State.Uninitialized)
      throw new Error(
        'AppService, synchronize: Not initialized, cannot synchronize. Call initialize first',
      );

    // get cloudflare zones
    const zones = await this.cloudFlareService.getZones();
    // for each zone, get the zones records
    const zoneRecords = {} as { [key: string]: Record[] };
    const zoneRecordPromises = zones.map(
      (zone) =>
        new Promise<void>((resolve, reject) => {
          this.cloudFlareService
            .getDNSEntries(zone.id)
            .then((records) => {
              zoneRecords[zone.id] = records;
              resolve();
            })
            .catch((reason) => reject(reason));
        }),
    );
    await Promise.all(zoneRecordPromises);
    // get the docker containers
    // This is done first as it could error the process and we should always exit from error as soon as possible.
    // Zone records get processed after docker entries are loaded and processed.
    const containers = await this.dockerService.getContainers();
    // get the docker entries
    const dockerEntries =
      await this.dockerService.extractDNSEntries(containers);
    // process the zone entries
    const cloudFlareEntries = Object.entries(zoneRecords).flatMap(
      ([zoneId, entries]) =>
        this.cloudFlareService.mapDNSEntries(zoneId, entries),
    );
    // compute the set differences
    const setDifference = computeSetDifference(
      dockerEntries,
      cloudFlareEntries,
    );
    // prepare requests to add, update and delete
    let addedZoneCount = 0;
    const requests = [
      ...setDifference.add.map(async (entry) => {
        const zone = this.cloudFlareService.getZoneForEntry(zones, entry);
        if (!zone.isSuccessful || !zone.zone) return Promise.reject;
        addedZoneCount += 1;
        const parameter = this.getCloudFlareRecordParameters(
          zone.zone.id,
          entry,
        );
        return this.cloudFlareService.createEntry(parameter);
      }),
      ...setDifference.update.map(async ({ old, update }) => {
        const parameter = this.getCloudFlareRecordParameters(
          old.zoneId,
          update,
        );
        return this.cloudFlareService.updateEntry(old.id, parameter);
      }),
      ...setDifference.delete.map(async (entry) =>
        this.cloudFlareService.deleteEntry(entry.id, entry.zoneId),
      ),
    ];
    await Promise.all(requests);
    this.loggerService.log(
      `Synchronisation complete, entries changed: Added ${addedZoneCount}, Updated ${setDifference.update.length}, Deleted ${setDifference.delete.length}, Unchanged ${setDifference.unchanged.length}`,
    );
  }

  /**
   * Determines which factory method to invoke for creation of parameters.
   * Invokes it and returns the result.
   * @param {string} zoneId ID of the zone
   * @param {DnsbaseEntry} entry DNS entry to get creation or update parameters for
   * @returns Creation or Update parameters for Cloudflare
   * @throws {Error} If type of Dns entry can't be determined or is unsupported
   */
  private getCloudFlareRecordParameters(zoneId: string, entry: DnsbaseEntry) {
    if (isDnsAEntry(entry)) {
      return this.cloudFlareFactory.createOrUpdateARecordParams(zoneId, entry);
    }
    if (isDnsCnameEntry(entry)) {
      return this.cloudFlareFactory.createOrUpdateCNAMERecordParams(
        zoneId,
        entry,
      );
    }
    if (isDnsMxEntry(entry)) {
      return this.cloudFlareFactory.createOrUpdateMXRecordParams(zoneId, entry);
    }
    if (isDnsNsEntry(entry)) {
      return this.cloudFlareFactory.createOrUpdateNSRecordParams(zoneId, entry);
    }

    throw new Error(
      `AppService, getFactoryForRecordParameters: Unreachable error! No factory method available for Unsupported type. (type: ${entry.type})`,
    );
  }
}
