import { ICloudFlareEntry } from './dnsbase-entry';
import { DnsMxEntry } from './dnsmx-entry';

/**
 * Combines DnsMxEntry and DnsBaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsMxCloudflareEntry
  extends DnsMxEntry
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
