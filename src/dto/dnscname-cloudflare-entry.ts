import { DnsCnameEntry } from './dnscname-entry';

/**
 * Combines DnsCnameEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsCnameCloudflareEntry extends DnsCnameEntry {
  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;
}
