import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { ConfigService } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DnsbaseCloudflareEntry } from 'src/dto/dnsbase-cloudflare-entry';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { DnsNsEntry } from '../dto/dnsns-entry';
import { DnsbaseEntry, DNSTypes } from '../dto/dnsbase-entry';
import { IConfiguration } from '../app.configuration';
import { NestedError } from '../errors/nested-error';
import { DockerFactory } from './docker-factory';
import { DnsaEntry } from '../dto/dnsa-entry';

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
@Injectable()
export class DockerService {
  private logger = new Logger(DockerService.name);

  private docker: Docker;

  private dockerLabel: string;

  private state = States.Unintialized;

  constructor(
    @Inject() private readonly dockerFactory: DockerFactory,
    @Inject() private readonly configService: ConfigService<IConfiguration>,
  ) {}

  /**
   * Initializes the class by fetching the docker instance
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

    this.dockerLabel = `${this.configService.get('PROJECT_LABEL', { infer: true })}.${this.configService.get('TAG_VALUE', { infer: true })}`;
    this.state = States.Initialized;
  }

  /**
   * Finds containers with the labels associated with this instance of the docker-compose-external-dns project.
   * Returns the containers information verbatim.
   * */
  async getContainers(): Promise<Docker.ContainerInfo[]> {
    if (this.state !== States.Initialized)
      throw new Error(
        'DockerService, getContainers: not initialized, must call initialize',
      );
    try {
      return await this.docker.listContainers({
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
   */
  getDNSEntries(containers: Docker.ContainerInfo[]): DnsbaseEntry[] {
    if (this.state !== States.Initialized)
      throw new Error(
        'DockerService, getDNSEntries: not initialized, must call initialize',
      );

    const result: DnsbaseEntry[] = [];
    containers.forEach((current) => {
      try {
        // try to parse the JSON
        const baseInstance = JSON.parse(
          current.Labels[this.dockerLabel],
        ) as DnsbaseCloudflareEntry;
        if (baseInstance.id !== undefined) {
          this.logger.warn(
            `DockerService, getDNSEntries: container with id ${current.Id} has 'id' within it's JSON label, please remove it`,
          );
          return;
        }
        // Cast to appropriate type
        let instance: DnsbaseEntry;
        switch (baseInstance.type) {
          case DNSTypes.A:
            instance = plainToInstance(DnsaEntry, baseInstance);
            break;
          case DNSTypes.CNAME:
            instance = plainToInstance(DnsCnameEntry, baseInstance);
            break;
          case DNSTypes.MX:
            instance = plainToInstance(DnsMxEntry, baseInstance);
            break;
          case DNSTypes.NS:
            instance = plainToInstance(DnsNsEntry, baseInstance);
            break;
          default:
            this.logger.warn(
              `DockerService, getDNSEntries: container with id ${current.Id} has an unrecognised shape, check the values`,
            );
            return;
        }
        // validate
        const errors = validateSync(instance);
        // warn and ignore if any errors
        if (errors.length !== 0) {
          this.logger.warn(
            `DockerService, getDNSEntries: container with id ${current.Id} has validation errors`,
            errors,
          );
          return;
        }
        // valid! add to list and return
        result.push(instance);
      } catch (error) {
        // failed to parse the JSON
        this.logger.warn(
          `DockerService, getDNSEntries: container with id ${current.Id} has a non JSON formatted label`,
        );
      }
    });
    return result;
  }
}
