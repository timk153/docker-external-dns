import { IsBoolean } from 'class-validator';
import { DnsbaseEntry } from './dnsbase-entry';

/**
 * Represents a DNS Entry which contains the CloudFlare Proxy value
 */
export abstract class DnsbaseCloudflareProxyEntry extends DnsbaseEntry {
  @IsBoolean()
  proxy: boolean;
}
