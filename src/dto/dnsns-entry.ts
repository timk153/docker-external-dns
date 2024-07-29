import { IsFQDN } from 'class-validator';
import { DnsbaseEntry, DNSTypes, IHasDnsType } from './dnsbase-entry';

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

/**
 * TypeGuard to determine if the instance is a DnsNsEntry
 * @param {IHasnsType} entr implements the type property
 * @returns true if DnsNsEntry else false
 */
export function isDnsNsEntry(entry: IHasDnsType): entry is DnsNsEntry {
  return entry.type === DNSTypes.NS;
}
