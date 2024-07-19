import { DnsNsEntry } from './dnsns-entry';

/**
 * Combines DnsNsEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsNsCloudflareEntry extends DnsNsEntry {
  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;
}
