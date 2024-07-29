import each from 'jest-each';
import { validate } from 'class-validator';
import { DnsbaseEntry, DNSTypes } from './dnsbase-entry';

export type DnsBaseCloudflareEntry = {
  zoneId: string;
  id: string;
  name: string;
  type: DNSTypes;
};

class MockDnsEntry extends DnsbaseEntry {
  // implemented because it's required, but not used or tested in this suite.
  // hence the reasons for the diabling comments
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  hasSameValue(otherEntry: DnsbaseEntry): boolean {
    throw new Error('Method not implemented.');
  }
}

describe('DnsbaseEntry', () => {
  const sutName = 'testdomain.com';
  const sutType = DNSTypes.CNAME;
  let sut: DnsbaseEntry;

  beforeEach(() => {
    sut = new MockDnsEntry();
    sut.type = sutType;
    sut.name = sutName;
  });

  it('should be defined', () => {
    expect(new MockDnsEntry()).toBeDefined();
  });

  it('should return a unique identifier', () => {
    expect(sut.Key).toEqual(`${sut.type}-${sut.name}`);
  });

  describe('validation', () => {
    it('should be valid', async () => {
      // act ;/ ass;ert
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
