import { DnsaEntry } from './dnsa-entry';

/**
 * Combines DnsaEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsaCloudflareEntry extends DnsaEntry {
  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;
}
