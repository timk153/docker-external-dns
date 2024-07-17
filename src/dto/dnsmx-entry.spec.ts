import each from 'jest-each';
import { validate } from 'class-validator';
import { DNSTypes } from './dnsbase-entry';
import { DnsMxEntry } from './dnsmx-entry';
import { DnsMxCloudflareEntry } from './dnsmx-cloudflare-entry';

/**
 * Returns a new valid DnsCanmeEntry.
 * Used by other test cases
 * @returns { DnsMxEntry } result
 */
export function validDnsMxEntry<T extends DnsMxEntry | DnsMxCloudflareEntry>(
  EntryType: new () => T,
) {
  const result = new EntryType();
  result.type = DNSTypes.MX;
  result.name = 'testdomain.com';
  result.server = 'mx1.testdomain.com';
  result.priority = 50;
  return result;
}

describe('DnsMxEntry', () => {
  let sut: DnsMxEntry;

  beforeEach(() => {
    sut = validDnsMxEntry(DnsMxEntry);
  });

  it('should be defined', () => {
    expect(new DnsMxEntry()).toBeDefined();
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

    describe('priority', () => {
      each([0, 12845, 43690, 65535]).it(
        'should allow whole numbers between 0 and 65535 (%p)',
        (priority) => {
          // arrange
          sut.priority = priority;
          // act / assert
          expect(validate(sut)).resolves.toHaveLength(0);
        },
      );

      each([-100, -1, 12845.5, 65536, 75000]).it(
        'should reject negatives, above 65535 and non integers (%p)',
        async (invalid) => {
          // arrange
          sut.priority = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('priority');
          expect(result[0].value).toBe(invalid);
        },
      );
    });
  });
});
