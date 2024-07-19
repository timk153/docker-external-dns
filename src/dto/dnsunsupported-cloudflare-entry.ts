import { DnsbaseEntry } from './dnsbase-entry';

/**
 * Exists to allow unsupported types returned by CloudFlare can be procedded.
 */
export class DnsUnsupportedCloudFlareEntry extends DnsbaseEntry {
  /**
   * Generated ID from CloudFlare.
   * No validation required
   */
  id: string;

  /**
   * Has no values, so method not implemented
   * @throws {Error} if called
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  hasSameValue(otherEntry: DnsbaseEntry): boolean {
    throw new Error('Method not implemented.');
  }
}
