import { DnsbaseEntry } from './dnsbase-entry';

/**
 * Base DNS entry from Cloudflare.
 * Includes the unique id assigned by CloudFlare.
 */
export class DnsbaseCloudflareEntry extends DnsbaseEntry {
  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;
}
