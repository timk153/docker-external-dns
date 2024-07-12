import each from 'jest-each';
import { validate } from 'class-validator';
import { DNSTypes } from './dnsbase-entry';
import { DnsaEntry } from './dnsa-entry';

/**
 * Returns a new valid DnsAEntry.
 * Used by other test cases
 * @returns {DnsaEntry} result
 */
export function validDnsAEntry() {
  const result = new DnsaEntry();
  result.type = DNSTypes.A;
  result.name = 'testdomain.com';
  result.address = '8.8.8.8';
  result.proxy = false;
  return result;
}

describe('DnsaEntry', () => {
  let sut: DnsaEntry;

  beforeEach(() => {
    sut = validDnsAEntry();
  });

  it('should be defined', () => {
    expect(new DnsaEntry()).toBeDefined();
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
