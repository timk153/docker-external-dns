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
        expect(entry.Key).not.toEqual(compare.Key);
      },
    );

    each([DnsaEntry, DnsaCloudflareEntry]).it(
      'should have the same value and identity (type %p)',
      (type) => {
        // arrange
        const entry = validDnsAEntry(type);
        const compare = validDnsAEntry(type);

        // act
        expect(entry.hasSameValue(compare)).toBe(true);
        expect(entry.Key).toEqual(compare.Key);
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
        expect(entry.Key).not.toEqual(compare.Key);
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
        expect(entry.Key).toEqual(compare.Key);
      },
    );
  });

  describe('validation', () => {
    describe('address', () => {
      /**
       * Unit testing the validator decorators are tricky.
       * This is a small integration test to ensure the basic behavior is working.
       * This gives confidence the decorator is being used.
       */

      it('should be valid - DDNS', async () => {
        // arrange
        sut.address = 'DDNS';

        // act / assert
        await expect(validate(sut)).resolves.toHaveLength(0);
      });

      it('should be valid - IP', async () => {
        // arrange
        sut.address = '8.8.8.8';

        // act / assert
        await expect(validate(sut)).resolves.toHaveLength(0);
      });

      it('should be invalid', async () => {
        // arrange
        sut.address = 'invalid';

        // act / assert
        const result = await validate(sut);

        expect(result).toHaveLength(1);
        expect(result[0].property).toEqual('address');
        expect(result[0].value).toEqual(sut.address);
      });
    });
  });
});
