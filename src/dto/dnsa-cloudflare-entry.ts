import { IntersectionType } from '@nestjs/mapped-types';
import { DnsaEntry } from './dnsa-entry';
import { DnsbaseCloudflareEntry } from './dnsbase-cloudflare-entry';

/**
 * Combines DnsaEntry and DnsbaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsaCloudflareEntry extends IntersectionType(
  DnsaEntry,
  DnsbaseCloudflareEntry,
) {}
