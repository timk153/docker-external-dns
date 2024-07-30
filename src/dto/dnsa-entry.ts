import { IsIP } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';
import { DNSTypes, IHasDnsType } from './dnsbase-entry';

/**
 * Represents an A record
 */
export class DnsaEntry extends DnsbaseCloudflareProxyEntry {
  /**
   * IP Address this DNSA record points to.
   */
  @IsIP()
  address: string;

  /**
   * Determines if two DNSaEntries share the same values (not identities!)
   * @param otherEntry Entry to compare values for
   * @returns True if they have the same values, otherwise false
   */
  hasSameValue(otherEntry: DnsaEntry): boolean {
    return (
      this.address === otherEntry.address && this.proxy === otherEntry.proxy
    );
  }
}

/**
 * TypeGuard to determine if the instance is a DnsaEntry
 * @param {IHasnsType} entr implements the type property
 * @returns true if DnsaEntry else false
 */
export function isDnsAEntry(entry: IHasDnsType): entry is DnsaEntry {
  return entry.type === DNSTypes.A;
}
