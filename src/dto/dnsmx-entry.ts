import { IsFQDN, IsInt, Max, Min } from 'class-validator';
import { DnsbaseEntry, DNSTypes, IHasDnsType } from './dnsbase-entry';

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

  hasSameValue(otherEntry: DnsMxEntry): boolean {
    return (
      this.server === otherEntry.server && this.priority === otherEntry.priority
    );
  }
}

/**
 * TypeGuard to determine if the instance is a DnsMxEntry
 * @param {IHasnsType} entr implements the type property
 * @returns true if DnsMxEntry else false
 */
export function isDnsMxEntry(entry: IHasDnsType): entry is DnsMxEntry {
  return entry.type === DNSTypes.MX;
}
