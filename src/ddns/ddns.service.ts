import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP, isNumber } from 'class-validator';
import { NestedError } from '../errors/nested-error';
import { CronService, State } from '../cron/cron.service';
import { ConsoleLoggerService } from '../logger.service';
import { isDnsAEntry } from '../dto/dnsa-entry';
import { DnsbaseEntry } from '../dto/dnsbase-entry';
import { getLogClassDecorator } from '../utility.functions';

let loggerPointer: ConsoleLoggerService;
const LogDecorator = getLogClassDecorator(() => loggerPointer);

/**
 * Represents the response structure from invoking ipinfo.io
 * NOTE! this only maps the properties this application uses.
 * It only represents a partial type mapping.
 */
export type IPInfoIOResponse = {
  ip: string;
};

@LogDecorator()
@Injectable()
export class DdnsService extends CronService {
  private ipAddress?: string;

  /**
   * ServiceName used in logging present in CronService
   */
  // eslint-disable-next-line class-methods-use-this
  get ServiceName(): string {
    return DdnsService.name;
  }

  /**
   * NOTE! intentionally not a property as createMock behaves incorrectly
   *
   * Exposes the state of the cron service.
   * Used to determine if it should be started as DDNS could be enabled at any time.
   */
  public getState(): State {
    return this.stateCron;
  }

  /**
   * NOTE! intentionally not a property as createMock behaves incorrectly
   *
   * Returns the current public IP Address.
   * Will be undefined if not loaded
   */
  public getIPAddress(): string | undefined {
    return this.ipAddress;
  }

  /**
   * Fetches the execution frequency for the Ddns service from the configuration
   */
  get ExecutionFrequencySeconds(): number {
    const executionIntervalMinutes: number | undefined =
      this.configService.get<number>('DDNS_EXECUTION_FREQUENCY_MINUTES', {
        infer: true,
      });
    if (!isNumber(executionIntervalMinutes))
      throw new Error(
        `AppService, ExecutionIntervalSeconds: Unreachable error, DDNS_EXECUTION_FREQUENCY_MINUTES isn't a number (${executionIntervalMinutes})`,
      );
    return executionIntervalMinutes * 60;
  }

  constructor(
    private configService: ConfigService,
    @Inject() loggerService: ConsoleLoggerService,
  ) {
    super(loggerService);
    loggerPointer = this.loggerService;
  }

  /**
   * Fetches the current public IP address and updates the state.
   * Will warn and leave ip unchanged if failure to fetch.
   */
  async job(): Promise<void> {
    try {
      const resultIpv4 = await fetch('https://ipinfo.io', {
        headers: { accept: 'application/json' },
      });
      try {
        const resultJson = (await resultIpv4.json()) as IPInfoIOResponse;
        if (resultJson.ip === undefined) {
          const error = new Error(
            `DdnsService, job: Error fetching IP Address, response has unexpected shape (${resultJson})`,
          );
          this.loggerService.error(error);
          return;
        }
        if (!isIP(resultJson.ip)) {
          const error = new Error(
            `DdnsService, job: Error fetching IP Address, value returned as ip address is not recognisable as an ip address (${resultJson.ip})`,
          );
          this.loggerService.error(error);
          return;
        }
        if (this.ipAddress === undefined)
          this.loggerService.log(
            `DDNS Service found a new IP address ${resultJson.ip}. DNS will update on next synchronisation.`,
          );
        else if (this.ipAddress !== resultJson.ip)
          this.loggerService.log(
            `DDNS Service found a new IP address ${resultJson.ip}, old address was ${this.ipAddress}. DNS will update on next synchronisation.`,
          );
        this.ipAddress = resultJson.ip;
      } catch (error) {
        const nestedError = new NestedError(
          'DdnsService, job: Error fetching IP Address, deserilizing response failed',
          error,
        );
        this.loggerService.error(nestedError);
      }
    } catch (error) {
      const nestedError = new NestedError(
        'DdnsService, job: Error fetching IP Address',
        error,
      );
      this.loggerService.error(nestedError);
    }
  }

  /**
   * Determines if any of the supplied entries are set to DDNS type.
   * If so returns true, else false.
   *
   * @param dnsEntries List of DnsbaseEntries
   */
  // Note, 'this' isn't required as logging is done via class decorator.
  // Disabled eslint rule for this method
  //
  // eslint-disable-next-line class-methods-use-this
  isDdnsRequired(dnsEntries: DnsbaseEntry[]) {
    return dnsEntries
      .filter((entry) => isDnsAEntry(entry))
      .some((entry) => entry.address === 'DDNS');
  }
}
