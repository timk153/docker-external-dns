import { DnsaEntry } from './dnsa-entry';
import { ICloudFlareEntry } from './dnsbase-entry';

/**
 * Combines DnsaEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsaCloudflareEntry extends DnsaEntry implements ICloudFlareEntry {
  /**
   * ID of the cloudflare zone this record belongs to
   */
  zoneId: string;

  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;
}
