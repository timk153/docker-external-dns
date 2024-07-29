import { IsIP } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';
import { DNSTypes, IHasDnsType } from './dnsbase-entry';

/**
 * Represents an A record
 */
export class DnsaEntry extends DnsbaseCloudflareProxyEntry {
  @IsIP()
  address: string;

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
