import each from 'jest-each';
import { validate } from 'class-validator';
import { DNSTypes } from './dnsbase-entry';
import { DnsNsEntry } from './dnsns-entry';

/**
 * Returns a new valid DnsNsEntry.
 * Used by other test cases
 * @returns { DnsNsEntry } result
 */
export function validDnsNsEntry() {
  const result = new DnsNsEntry();
  result.type = DNSTypes.NS;
  result.name = 'testdomain.com';
  result.server = 'ns1.testdomain.com';
  return result;
}

describe('DnsNsEntry', () => {
  let sut: DnsNsEntry;

  beforeEach(() => {
    sut = validDnsNsEntry();
  });

  it('should be defined', () => {
    expect(new DnsNsEntry()).toBeDefined();
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
