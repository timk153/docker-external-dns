import { IntersectionType } from '@nestjs/mapped-types';
import { DnsbaseCloudflareEntry } from './dnsbase-cloudflare-entry';
import { DnsMxEntry } from './dnsmx-entry';

/**
 * Combines DnsMxEntry and DnsbaseCloudflareEntry
 *
 * This is the type as read from Cloudflare API
 */
export class DnsMxCloudflareEntry extends IntersectionType(
  DnsMxEntry,
  DnsbaseCloudflareEntry,
) {}
