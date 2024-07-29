import { ICloudFlareEntry } from './dnsbase-entry';
import { DnsNsEntry } from './dnsns-entry';

/**
 * Combines DnsNsEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsNsCloudflareEntry
  extends DnsNsEntry
  implements ICloudFlareEntry
{
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
