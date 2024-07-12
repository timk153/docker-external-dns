import { IsFQDN, IsInt, Max, Min } from 'class-validator';
import { DnsbaseEntry } from './dnsbase-entry';

/**
 * Represents an MX record
 */
export class DnsMxEntry extends DnsbaseEntry {
  @IsFQDN()
  server: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  priority: number;
}
