import each from 'jest-each';
import { validate } from 'class-validator';
import { DnsbaseEntry, DNSTypes } from './dnsbase-entry';

class MockDnsEntry extends DnsbaseEntry {}

describe('DnsbaseEntry', () => {
  let sut: DnsbaseEntry;

  beforeEach(() => {
    sut = new MockDnsEntry();
    sut.type = DNSTypes.CNAME;
    sut.name = 'testdomain.com';
  });

  it('should be defined', () => {
    expect(new MockDnsEntry()).toBeDefined();
  });

  describe('validation', () => {
    it('should be valid', async () => {
      // act / assert
      expect(validate(sut)).resolves.toHaveLength(0);
    });

    describe('name', () => {
      each(['test.work', 'www.test.work', 'ns1.test.work', 'mx.test.work']).it(
        'should be a valid domain name (%p)',
        async (domainName) => {
          // arrange
          sut.name = domainName;

          // act / assert
          expect(validate(sut)).resolves.toHaveLength(0);
        },
      );

      each(['a', 'em', '', '   ', '123', 'test@thing.com']).it(
        'should not be an invalid string (%p)',
        async (invalid) => {
          // arrange
          sut.name = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('name');
          expect(result[0].value).toBe(invalid);
        },
      );
    });

    describe('type', () => {
      each(Object.keys(DNSTypes)).it(
        'should be a valid DNS type (%p)',
        async (dnsType) => {
          // arrange
          sut.type = DNSTypes[dnsType as keyof typeof DNSTypes];

          // act / assert
          expect(validate(sut)).resolves.toHaveLength(0);
        },
      );

      each(['a', 'em', '', '   ', '123', 'test@thing.com']).it(
        'should not be an invalid string (%p)',
        async (invalid) => {
          // arrange
          sut.type = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('type');
          expect(result[0].value).toBe(invalid);
        },
      );
    });
  });
});
