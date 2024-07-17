import { DnsbaseCloudflareEntry } from './dnsbase-cloudflare-entry';

/**
 * Exists to allow unsupported types returned by CloudFlare can be procedded.
 */
export class DnsUnsupportedCloudFlareEntry extends DnsbaseCloudflareEntry {}
