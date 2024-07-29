import { IsFQDN } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';
import { DNSTypes, IHasDnsType } from './dnsbase-entry';

/**
 * Represents an CNAME record
 */
export class DnsCnameEntry extends DnsbaseCloudflareProxyEntry {
  @IsFQDN()
  target: string;

  hasSameValue(otherEntry: DnsCnameEntry): boolean {
    return this.target === otherEntry.target && this.proxy === otherEntry.proxy;
  }
}

/**
 * TypeGuard to determine if the instance is a DnsCnameEntry
 * @param {IHasnsType} entr implements the type property
 * @returns true if DnsCnameEntry else false
 */
export function isDnsCnameEntry(entry: IHasDnsType): entry is DnsCnameEntry {
  return entry.type === DNSTypes.CNAME;
}
