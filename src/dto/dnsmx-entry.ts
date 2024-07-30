import { IsFQDN, IsInt, Max, Min } from 'class-validator';
import { DnsbaseEntry, DNSTypes, IHasDnsType } from './dnsbase-entry';

/**
 * Represents an MX record
 */
export class DnsMxEntry extends DnsbaseEntry {
  /**
   * The server in the MX Record.
   * e.g. mx1.testdomain.com
   */
  @IsFQDN()
  server: string;

  /**
   * The priority number of this MX record entry.
   * Must be an integer between 0 and 65535.
   */
  @IsInt()
  @Min(0)
  @Max(65535)
  priority: number;

  /**
   * Determines if another MX Entry has the same values as this one.
   * Does not comapre identities!
   * @param otherEntry The other MX Etry to compare
   * @returns true if identical else false
   */
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
