import each from 'jest-each';
import { validate } from 'class-validator';
import { DNSTypes } from './dnsbase-entry';
import { DnsaEntry } from './dnsa-entry';
import { DnsaCloudflareEntry } from './dnsa-cloudflare-entry';

/**
 * Returns a new valid DnsAEntry.
 * Used by other test cases
 * @returns {DnsaEntry} result
 */
export function validDnsAEntry<T extends DnsaEntry | DnsaCloudflareEntry>(
  EntryType: new () => T,
  defaults?: Partial<T>,
) {
  const result = new EntryType();
  result.type = DNSTypes.A;
  result.name = defaults?.name ?? 'testdomain.com';
  result.address = defaults?.address ?? '8.8.8.8';
  result.proxy = defaults?.proxy ?? false;
  return result;
}

describe('DnsaEntry', () => {
  let sut: DnsaEntry;

  beforeEach(() => {
    sut = validDnsAEntry(DnsaEntry);
  });

  it('should be defined', () => {
    expect(new DnsaEntry()).toBeDefined();
  });

  describe('hasSameValue', () => {
    each([DnsaEntry, DnsaCloudflareEntry]).it(
      'should have the same value, but different identity (type %p)',
      (type) => {
        // arrange
        const entry = validDnsAEntry(type);
        const compare = validDnsAEntry(type);
        compare.name = `${entry.name}-1`;
        compare.type = DNSTypes.CNAME;

        // act / assert
        expect(entry.hasSameValue(compare)).toBe(true);
      },
    );

    each([DnsaEntry, DnsaCloudflareEntry]).it(
      'should have the same value and identity (type %p)',
      (type) => {
        // arrange
        const result = validDnsAEntry(type);

        // act
        expect(result.hasSameValue(result)).toBe(true);
      },
    );

    each([
      [DnsaEntry, 'different.com', undefined],
      [DnsaEntry, undefined, true],
      [DnsaEntry, 'different.com', true],
      [DnsaCloudflareEntry, 'different.com', undefined],
      [DnsaCloudflareEntry, undefined, true],
      [DnsaCloudflareEntry, 'different.com', true],
    ]).it(
      'should not have the same value or identity (type: %p, address: %p, proxy: %p)',
      (type, address, proxy) => {
        // arrange
        const entry = validDnsAEntry(type);
        const compare = validDnsAEntry(type);
        compare.name = `${entry.name}-1`;
        compare.type = DNSTypes.CNAME;
        compare.address = address ?? entry.address;
        compare.proxy = proxy === undefined ? entry.proxy : proxy;

        // act / assert
        expect(entry.hasSameValue(compare)).toBe(false);
      },
    );

    each([
      [DnsaEntry, 'different.com', undefined],
      [DnsaEntry, undefined, true],
      [DnsaEntry, 'different.com', true],
      [DnsaCloudflareEntry, 'different.com', undefined],
      [DnsaCloudflareEntry, undefined, true],
      [DnsaCloudflareEntry, 'different.com', true],
    ]).it(
      'should not have the same value, but same identity (type %p)',
      (type, address, proxy) => {
        // arrange
        const entry = validDnsAEntry(type);
        const compare = validDnsAEntry(type);
        compare.address = address ?? entry.address;
        compare.proxy = proxy === undefined ? entry.proxy : proxy;

        // act
        expect(entry.hasSameValue(compare)).toBe(false);
      },
    );
  });

  describe('validation', () => {
    it('should be valid', async () => {
      // act / assert
      expect(validate(sut)).resolves.toHaveLength(0);
    });

    describe('address', () => {
      each([
        '192.168.0.53',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3::8a2e:370:7334',
      ]).it('should be a valid address (%p)', async (address) => {
        // arrange
        sut.address = address;

        // act / assert
        expect(validate(sut)).resolves.toHaveLength(0);
      });

      each(['a', 'em', '', '   ', '123', 'test@thing.com']).it(
        'should not be an invalid string (%p)',
        async (invalid) => {
          // arrange
          sut.address = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('address');
          expect(result[0].value).toBe(invalid);
        },
      );
    });
  });
});
