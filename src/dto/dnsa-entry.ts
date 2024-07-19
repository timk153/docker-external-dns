import { IsIP } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';

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
