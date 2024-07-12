import { IsIP } from 'class-validator';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';

/**
 * Represents an A record
 */
export class DnsaEntry extends DnsbaseCloudflareProxyEntry {
  @IsIP()
  address: string;
}
