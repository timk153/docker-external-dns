import each from 'jest-each';
import { validate } from 'class-validator';
import { DnsbaseEntry, DNSTypes } from './dnsbase-entry';
import { DnsbaseCloudflareProxyEntry } from './dnsbase-cloudflare-proxy-entry';

class MockDnsEntry extends DnsbaseCloudflareProxyEntry {
  // not used, so can be ignored
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  hasSameValue(otherEntry: DnsbaseEntry): boolean {
    throw new Error('Method not implemented.');
  }
}

describe('DnsbaseCloudflareProxyEntry', () => {
  let sut: MockDnsEntry;

  beforeEach(() => {
    sut = new MockDnsEntry();
    sut.type = DNSTypes.CNAME;
    sut.name = 'test.testdomain.com';
    sut.proxy = false;
  });

  it('should be defined', () => {
    expect(new MockDnsEntry()).toBeDefined();
  });

  describe('validation', () => {
    it('should be valid', async () => {
      // act / assert
      expect(validate(sut)).resolves.toHaveLength(0);
    });

    describe('proxy', () => {
      each([true, false]).it(
        'should be a valid boolean (%p)',
        async (value) => {
          // arrange
          sut.proxy = value;

          // act / assert
          expect(validate(sut)).resolves.toHaveLength(0);
        },
      );

      each(['0', '1', 'abc']).it(
        'should not be a non boolean value (%p)',
        async (invalid) => {
          // arrange
          sut.proxy = invalid;

          // act
          const result = await validate(sut);

          // assert
          expect(result).toHaveLength(1);
          expect(result[0].property).toBe('proxy');
          expect(result[0].value).toBe(invalid);
        },
      );
    });
  });
});
