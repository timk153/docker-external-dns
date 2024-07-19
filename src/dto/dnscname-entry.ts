import { IsFQDN } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';

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
