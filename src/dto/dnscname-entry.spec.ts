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
>(EntryType: new () => T) {
  const result = new EntryType();
  result.type = DNSTypes.CNAME;
  result.name = 'test.testdomain.com';
  result.target = 'testdomain.com';
  result.proxy = false;
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
