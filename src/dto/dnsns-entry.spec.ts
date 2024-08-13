import each from 'jest-each';
import { validate } from 'class-validator';
import { DNSTypes } from './dnsbase-entry';
import { DnsNsEntry } from './dnsns-entry';
import { DnsNsCloudflareEntry } from './dnsns-cloudflare-entry';

/**
 * Returns a new valid DnsNsEntry.
 * Used by other test cases
 * @returns { DnsNsEntry } result
 */
export function validDnsNsEntry<T extends DnsNsEntry | DnsNsCloudflareEntry>(
  EntryType: new () => T,
  defaults?: Partial<T>,
) {
  const result = new EntryType();
  result.type = DNSTypes.NS;
  result.name = defaults?.name ?? 'testdomain.com';
  result.server = defaults?.server ?? 'ns1.testdomain.com';
  return result;
}

describe('DnsNsEntry', () => {
  let sut: DnsNsEntry;

  beforeEach(() => {
    sut = validDnsNsEntry(DnsNsEntry);
  });

  it('should be defined', () => {
    expect(new DnsNsEntry()).toBeDefined();
  });

  describe('hasSameValue', () => {
    each([DnsNsEntry, DnsNsCloudflareEntry]).it(
      'should have the same value, but different identity (type %p)',
      (type) => {
        // arrange
        const entry = validDnsNsEntry(type);
        const compare = validDnsNsEntry(type);
        compare.name = `${entry.name}-1`;
        compare.type = DNSTypes.CNAME;

        // act / assert
        expect(entry.hasSameValue(compare)).toBe(true);
        expect(entry.Key).not.toEqual(compare.Key);
      },
    );

    each([DnsNsEntry, DnsNsCloudflareEntry]).it(
      'should have the same value and identity (type %p)',
      (type) => {
        // arrange
        const entry = validDnsNsEntry(type);
        const compare = validDnsNsEntry(type);

        // act
        expect(entry.hasSameValue(compare)).toBe(true);
        expect(entry.Key).toEqual(compare.Key);
      },
    );

    each([
      [DnsNsEntry, 'different.com'],
      [DnsNsCloudflareEntry, 'different.com'],
    ]).it(
      'should not have the same value or identity (type: %p, server: %p)',
      (type, server) => {
        // arrange
        const entry = validDnsNsEntry(type);
        const compare = validDnsNsEntry(type);
        compare.name = `${entry.name}-1`;
        compare.type = DNSTypes.A;
        compare.server = server ?? entry.server;

        // act / assert
        expect(entry.hasSameValue(compare)).toBe(false);
        expect(entry.Key).not.toEqual(compare.Key);
      },
    );

    each([
      [DnsNsEntry, 'different.com'],
      [DnsNsCloudflareEntry, 'different.com'],
    ]).it(
      'should not have the same value, but same identity (type: %p, server: %p)',
      (type, server) => {
        // arrange
        const entry = validDnsNsEntry(type);
        const compare = validDnsNsEntry(type);
        compare.server = server ?? entry.server;

        // act
        expect(entry.hasSameValue(compare)).toBe(false);
        expect(entry.Key).toEqual(compare.Key);
      },
    );
  });

  describe('validation', () => {
    it('should be valid', async () => {
      // act / assert
      expect(validate(sut)).resolves.toHaveLength(0);
    });

    describe('server', () => {
      each(['test.work', 'www.test.work', 'ns1.test.work', 'mx.test.work']).it(
        'should be a valid domain name (%p)',
        async (domainName) => {
          // arrange
          sut.server = domainName;

          // act / assert
          expect(validate(sut)).resolves.toHaveLength(0);
        },
      );

      each(['a', 'em', '', '   ', '123', 'test@thing.com']).it(
        'should not be an invalid string (%p)',
        async (invalid) => {
          // arrange
          sut.server = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('server');
          expect(result[0].value).toBe(invalid);
        },
      );
    });
  });
});
