import { IsEnum, IsFQDN } from 'class-validator';

/**
 * Types of DNS entry supported
 */
export enum DNSTypes {
  A,
  CNAME,
  MX,
  NS,
  Unsupported,
}

/**
 * The base type for all DNS entries
 */
export abstract class DnsbaseEntry {
  @IsEnum(DNSTypes)
  type: DNSTypes;

  @IsFQDN()
  name: string;

  /**
   * Unique identitier for this entry as a string
   */
  get Key(): string {
    return `${this.type}-${this.name}`;
  }

  /**
   * Compares the non identity values to determine if the values match.
   * True if values match, else false.
   * @param {DnsbaseEntry} otherEntry the entry to compare to
   * @returns {boolean} true if values match, else false
   */
  abstract hasSameValue(otherEntry: DnsbaseEntry): boolean;
}
