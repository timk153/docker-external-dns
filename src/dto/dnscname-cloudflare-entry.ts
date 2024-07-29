import { ICloudFlareEntry } from './dnsbase-entry';
import { DnsCnameEntry } from './dnscname-entry';

/**
 * Combines DnsCnameEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsCnameCloudflareEntry
  extends DnsCnameEntry
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
