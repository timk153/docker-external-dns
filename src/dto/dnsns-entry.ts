import { IsFQDN, Matches } from 'class-validator';
import { DnsbaseEntry, DNSTypes, IHasDnsType } from './dnsbase-entry';

/**
 * Represents an NS record
 */
export class DnsNsEntry extends DnsbaseEntry {
  /**
   * The name server.
   * Must be a FQDN.
   * e.g. ns1.testdomain.com
   */
  @IsFQDN()
  server: string;

  /**
   * Overrides the abstract base defined name record to redefine the validation rules for NS records.
   * wildcards: per RFC 4592 §4.2 a wildcard NS RRset is discouraged and does
   * not create a delegation, so wildcards are only allowed for A/CNAME/MX.
   */
  @IsFQDN()
  name: string;

  /**
   * Determines if another DnsNsEntry has the same values as this one.
   * Does not comapre identities only values.
   * @param otherEntry Other DnsNsEntry to compare values with
   * @returns true if identical in value else false
   */
  hasSameValue(otherEntry: DnsNsEntry): boolean {
    return this.server === otherEntry.server;
  }
}

/**
 * TypeGuard to determine if the instance is a DnsNsEntry
 * @param {IHasnsType} entr implements the type property
 * @returns true if DnsNsEntry else false
 */
export function isDnsNsEntry(entry: IHasDnsType): entry is DnsNsEntry {
  return entry.type === DNSTypes.NS;
}
