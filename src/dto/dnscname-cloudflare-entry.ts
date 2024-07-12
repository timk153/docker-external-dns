import { IntersectionType } from '@nestjs/mapped-types';
import { DnsbaseCloudflareEntry } from './dnsbase-cloudflare-entry';
import { DnsCnameEntry } from './dnscname-entry';

/**
 * Combines DnsCnameEntry and DnsbaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsCnameCloudflareEntry extends IntersectionType(
  DnsCnameEntry,
  DnsbaseCloudflareEntry,
) {}
