import { IsEnum, IsFQDN } from 'class-validator';

/**
 * Basic interface which says at least type must exist.
 */
export interface IHasDnsType {
  type: DNSTypes;
}

/**
 * Properties expected if the entry originated from cloudflare
 */
export interface ICloudFlareEntry extends IHasDnsType {
  /**
   * CloudFlare ID for this record
   */
  id: string;

  /**
   * ID of the Zone this record belongs to in CloudFlare
   */
  zoneId: string;

  /**
   * Name of this record.
   * Must be a fully qualified domain name
   */
  name: string;

  /**
   * Unique identifier for this record.
   * Combination of zone id and name.
   */
  get Key(): string;

  /**
   * Determines if this entry shares identical values with another entry.
   * Does NOT check if identities match.
   * @param otherEntry Entry to check for sameness
   * @returns true if identical values else false
   */
  hasSameValue(otherEntry: DnsbaseEntry): boolean;
}

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
  /**
   * The type of this record.
   * For example:
   * - A
   * - CNAME
   * - MX
   * - NS
   */
  @IsEnum(DNSTypes)
  type: DNSTypes;

  /**
   * The name of this record.
   * Must be a FQDN.
   *
   * For example for a cname:
   * test.mydomain.com
   *
   * For an a:
   * mydomain.com
   */
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
