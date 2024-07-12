import { IntersectionType } from '@nestjs/mapped-types';
import { DnsbaseCloudflareEntry } from './dnsbase-cloudflare-entry';
import { DnsNsEntry } from './dnsns-entry';

/**
 * Combines DnsNsEntry and DnsbaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsNsCloudflareEntry extends IntersectionType(
  DnsNsEntry,
  DnsbaseCloudflareEntry,
) {}
