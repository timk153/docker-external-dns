import { IsFQDN } from 'class-validator';
import { DnsbaseEntry } from './dnsbase-entry';

/**
 * Represents an NS record
 */
export class DnsNsEntry extends DnsbaseEntry {
  @IsFQDN()
  server: string;

  hasSameValue(otherEntry: DnsNsEntry): boolean {
    return this.server === otherEntry.server;
  }
}
