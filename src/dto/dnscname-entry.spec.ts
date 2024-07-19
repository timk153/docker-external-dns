import each from 'jest-each';
import { validate } from 'class-validator';
import { DNSTypes } from './dnsbase-entry';
import { DnsCnameEntry } from './dnscname-entry';
import { DnsCnameCloudflareEntry } from './dnscname-cloudflare-entry';

/**
 * Returns a new valid DnsCanmeEntry.
 * Used by other test cases
 * @returns { DnsCnameEntry } result
 */
export function validDnsCnameEntry<
  T extends DnsCnameEntry | DnsCnameCloudflareEntry,
>(EntryType: new () => T, defaults?: Partial<T>) {
  const result = new EntryType();
  result.type = DNSTypes.CNAME;
  result.name = defaults?.name ?? 'test.testdomain.com';
  result.target = defaults?.target ?? 'testdomain.com';
  result.proxy = defaults?.proxy ?? false;
  return result;
}

describe('DnsCnameEntry', () => {
  let sut: DnsCnameEntry;

  beforeEach(() => {
    sut = validDnsCnameEntry(DnsCnameEntry);
  });

  it('should be defined', () => {
    expect(new DnsCnameEntry()).toBeDefined();
  });

  describe('hasSameValue', () => {
    each([DnsCnameEntry, DnsCnameCloudflareEntry]).it(
      'should have the same value, but different identity (type %p)',
      (type) => {
        // arrange
        const entry = validDnsCnameEntry(type);
        const compare = validDnsCnameEntry(type);
        compare.name = `${entry.name}-1`;
        compare.type = DNSTypes.A;

        // act / assert
        expect(entry.hasSameValue(compare)).toBe(true);
      },
    );

    each([DnsCnameEntry, DnsCnameCloudflareEntry]).it(
      'should have the same value and identity (type %p)',
      (type) => {
        // arrange
        const result = validDnsCnameEntry(type);

        // act
        expect(result.hasSameValue(result)).toBe(true);
      },
    );

    each([
      [DnsCnameEntry, 'different.com', undefined],
      [DnsCnameEntry, undefined, true],
      [DnsCnameEntry, 'different.com', true],
      [DnsCnameCloudflareEntry, 'different.com', undefined],
      [DnsCnameCloudflareEntry, undefined, true],
      [DnsCnameCloudflareEntry, 'different.com', true],
    ]).it(
      'should not have the same value or identity (type: %p, target: %p, proxy: %p)',
      (type, target, proxy) => {
        // arrange
        const entry = validDnsCnameEntry(type);
        const compare = validDnsCnameEntry(type);
        compare.name = `${entry.name}-1`;
        compare.type = DNSTypes.A;
        compare.target = target ?? entry.target;
        compare.proxy = proxy === undefined ? entry.proxy : proxy;

        // act / assert
        expect(entry.hasSameValue(compare)).toBe(false);
      },
    );

    each([
      [DnsCnameEntry, 'different.com', undefined],
      [DnsCnameEntry, undefined, true],
      [DnsCnameEntry, 'different.com', true],
      [DnsCnameCloudflareEntry, 'different.com', undefined],
      [DnsCnameCloudflareEntry, undefined, true],
      [DnsCnameCloudflareEntry, 'different.com', true],
    ]).it(
      'should not have the same value, but same identity (type: %p, target: %p, proxy: %p)',
      (type, target, proxy) => {
        // arrange
        const entry = validDnsCnameEntry(type);
        const compare = validDnsCnameEntry(type);
        compare.target = target ?? entry.target;
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

    describe('target', () => {
      each(['test.work', 'www.test.work', 'ns1.test.work', 'mx.test.work']).it(
        'should be a valid domain name (%p)',
        async (domainName) => {
          // arrange
          sut.target = domainName;

          // act / assert
          expect(validate(sut)).resolves.toHaveLength(0);
        },
      );

      each(['a', 'em', '', '   ', '123', 'test@thing.com']).it(
        'should not be an invalid string (%p)',
        async (invalid) => {
          // arrange
          sut.target = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('target');
          expect(result[0].value).toBe(invalid);
        },
      );
    });
  });
});
