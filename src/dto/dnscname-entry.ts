import { IsFQDN } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';
import { DNSTypes, IHasDnsType } from './dnsbase-entry';

/**
 * Represents an CNAME record
 */
export class DnsCnameEntry extends DnsbaseCloudflareProxyEntry {
  /**
   * The target this CNAME record points to
   * e.g. testdomain.com
   */
  @IsFQDN()
  target: string;

  /**
   * Determines if another CNAME record shares the same values.
   * Does not compare identities!
   * @param otherEntry Other entry to check values for
   * @returns True if values match, else false
   */
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
