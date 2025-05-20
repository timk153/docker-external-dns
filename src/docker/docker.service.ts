import { Inject, Injectable, LoggerService } from '@nestjs/common';
import Docker from 'dockerode';
import { ConfigService } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ConsoleLoggerService } from '../logger.service';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { DnsNsEntry } from '../dto/dnsns-entry';
import { DnsbaseEntry, DNSTypes } from '../dto/dnsbase-entry';
import { IConfiguration } from '../app.configuration';
import { NestedError } from '../errors/nested-error';
import { DockerFactory } from './docker.factory';
import { DnsaEntry } from '../dto/dnsa-entry';
import { DnsBaseCloudflareEntry } from '../dto/dnsbase-entry.spec';
import { getLogClassDecorator } from '../utility.functions';

let loggerPointer: LoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

/**
 * Possibe states of the docker service
 */
export enum States {
  Unintialized,
  Initialized,
}

/**
 * Adapter over dockerode to expose a minimal API for the purpose of this application.
 * Responsible for any interaction with dockerode, including:
 * - Initializing dockerode
 * - Encapsulating exceptions
 * - Querying for containers with labels based on our criteria
 * - Deserializing and validating the JSON labels
 */
@LogDecorator()
@Injectable()
export class DockerService {
  private docker: Docker;

  private dockerLabel: string;

  private preserveStopped: boolean;

  private state = States.Unintialized;

  constructor(
    @Inject() private readonly dockerFactory: DockerFactory,
    @Inject() private readonly configService: ConfigService<IConfiguration>,
    private loggerService: ConsoleLoggerService,
  ) {
    loggerPointer = this.loggerService;
  }

  /**
   * Initializes the class by fetching the docker instance
   * @throws { Error } If service is already initialized
   * @throws { NestedError } throws if err initializing docker
   */
  initialize(): void {
    if (this.state !== States.Unintialized)
      throw new Error(
        'DockerService, initialize: Failed initializing docker service, service alread initialized',
      );

    try {
      this.docker = this.dockerFactory.get();
    } catch (error) {
      throw new NestedError(
        'DockerService, initialize: Failed initializing docker service',
        error,
      );
    }

    this.dockerLabel = this.configService.get('ENTRY_IDENTIFIER', {
      infer: true,
    }) as string;
    this.preserveStopped = this.configService.get('PRESERVE_STOPPED', {
      infer: true,
    }) as boolean;
    this.state = States.Initialized;
  }

  /**
   * Finds containers with the labels associated with this instance of the docker-compose-external-dns project.
   * Returns the containers information verbatim.
   * @returns Promise resolving to the docker containers
   * @throws {Error} If serivce hasn't been initialized
   * @throws {NestedError} If docker throws an error fetching containers
   * */
  async getContainers(): Promise<Docker.ContainerInfo[]> {
    if (this.state !== States.Initialized)
      throw new Error(
        'DockerService, getContainers: not initialized, must call initialize',
      );
    try {
      return await this.docker.listContainers({
        all: this.preserveStopped,
        filters: JSON.stringify({ label: [this.dockerLabel] }),
      });
    } catch (error) {
      throw new NestedError(
        'DockerService, getContainers: Failed getting containers',
        error,
      );
    }
  }

  /**
   * Contains behavior to deserialize the labels on the containers.
   * Converts to appropriate type and validates
   * @param {Docker.ContainerInfo[]} containers containers with labels to deserialize
   * @returns {DnsbaseEntry[]} deserialized labels
   * @throws {Error} If serivce hasn't been initialized
   */
  @LogDecorator({ level: 'debug' })
  extractDNSEntries(containers: Docker.ContainerInfo[]): DnsbaseEntry[] {
    if (this.state !== States.Initialized)
      throw new Error(
        'DockerService, extractDNSEntries: not initialized, must call initialize',
      );

    const results: {
      [key: string]: { dns: DnsbaseEntry; container: Docker.ContainerInfo };
    } = {};
    const duplicates: {
      [key: string]: { dns: DnsbaseEntry; container: Docker.ContainerInfo }[];
    } = {};
    containers.forEach((current) => {
      try {
        // try to parse the JSON
        const entries = JSON.parse(
          current.Labels[this.dockerLabel],
        ) as DnsBaseCloudflareEntry[];
        if (!Array.isArray(entries)) {
          this.loggerService.warn(
            `DockerService, extractDNSEntries: container with id ${current.Id} has an unrecognised shape, check the values`,
          );
          return;
        }
        if (entries.length === 0) {
          this.loggerService.warn(
            `DockerService, extractDNSEntries: container with id ${current.Id} has empty array for a label and has been ignored`,
          );
          return;
        }
        entries.forEach((entry) => {
          if (entry.id !== undefined) {
            this.loggerService.warn(
              `DockerService, extractDNSEntries: container with id ${current.Id} has 'id' within it's JSON label, please remove it`,
            );
            return;
          }
          // Cast to appropriate type
          let instance: DnsbaseEntry;
          switch (entry.type) {
            case DNSTypes.A:
              instance = plainToInstance(DnsaEntry, entry);
              break;
            case DNSTypes.CNAME:
              instance = plainToInstance(DnsCnameEntry, entry);
              break;
            case DNSTypes.MX:
              instance = plainToInstance(DnsMxEntry, entry);
              break;
            case DNSTypes.NS:
              instance = plainToInstance(DnsNsEntry, entry);
              break;
            case DNSTypes.Unsupported:
              this.loggerService.warn(
                `DockerService, extractDNSEntries: container with id ${current.Id} is using 'Unsupported' type, it will be ignored`,
              );
              return;
            default:
              this.loggerService.warn(
                `DockerService, extractDNSEntries: container with id ${current.Id} has an unrecognised shape, check the values`,
              );
              return;
          }
          // validate
          const errors = validateSync(instance);
          // warn and ignore if any errors
          if (errors.length !== 0) {
            this.loggerService.warn(
              `DockerService, extractDNSEntries: container with id ${current.Id} has validation errors`,
              errors,
            );
            return;
          }
          if (duplicates[instance.Key] !== undefined)
            // if a duplication has already been detected
            // add to suplicates list
            duplicates[instance.Key].push({
              dns: instance,
              container: current,
            });
          else if (results[instance.Key] === undefined)
            // no duplication and no result registered
            // add to results list
            results[instance.Key] = { dns: instance, container: current };
          else {
            // duplicate detected.
            // no duplicate previously detected.
            // remove from results and add both to duplicate list.
            duplicates[instance.Key] = [
              results[instance.Key],
              { dns: instance, container: current },
            ];
            delete results[instance.Key];
          }
        });
      } catch (error) {
        // failed to parse the JSON
        this.loggerService.warn(
          `DockerService, extractDNSEntries: container with id ${current.Id} has a non JSON formatted label`,
        );
      }
    });
    // iterate duplicates to warn
    Object.entries(duplicates).forEach(([, entries]) => {
      const containerIds = JSON.stringify(
        entries.map((entry) => entry.container.Id),
      );
      const conflictingIdentity = JSON.stringify({
        type: entries[0].dns.type,
        name: entries[0].dns.name,
      });
      this.loggerService.warn(
        `DockerService, extractDNSEntries: containers with id's ${containerIds} have share duplicate entries for '${conflictingIdentity}'; all will be ignored`,
      );
    });

    return Object.values(results).map((entry) => entry.dns);
  }
}
