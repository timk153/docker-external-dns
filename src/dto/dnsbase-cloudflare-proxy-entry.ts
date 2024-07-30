import { IsBoolean } from 'class-validator';
import { DnsbaseEntry } from './dnsbase-entry';

/**
 * Represents a DNS Entry which contains the CloudFlare Proxy value
 */
export abstract class DnsbaseCloudflareProxyEntry extends DnsbaseEntry {
  /**
   * True if CloudFlare will run requests for this entry via a Proxy.
   * False if it resolves to the A Record associated with it in the chain.
   */
  @IsBoolean()
  proxy: boolean;
}
