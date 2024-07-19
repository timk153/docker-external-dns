import { DnsMxEntry } from './dnsmx-entry';

/**
 * Combines DnsMxEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsMxCloudflareEntry extends DnsMxEntry {
  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;
}
