import each from 'jest-each';
import { IsIPOrDDNS } from './iporddns.validator';

describe('IsIPOrDDNS', () => {
  let sut: IsIPOrDDNS;

  beforeEach(() => {
    sut = new IsIPOrDDNS();
  });

  it('should have appropriate default message', () => {
    // act / assert
    expect(sut.defaultMessage()).toEqual(
      'Text should be "DDNS" or an ipV4 or V6 address',
    );
  });

  each([
    '192.168.0.53',
    '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    '2001:db8:85a3::8a2e:370:7334',
    'DDNS',
  ]).it('should be a valid address or "DDNS" (%p)', async (value) => {
    // act / assert
    expect(sut.validate(value)).toEqual(true);
  });

  each(['a', 'em', '', '   ', '123', 'test@thing.com']).it(
    'should not be an invalid string (%p)',
    async (invalid) => {
      // act / assert
      expect(sut.validate(invalid)).toEqual(false);
    },
  );
});
