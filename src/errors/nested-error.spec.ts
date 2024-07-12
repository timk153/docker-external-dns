import { NestedError } from './nested-error';

describe('NestedError', () => {
  const paramMessage = 'message';
  const paramError = new Error('error');
  const sut = new NestedError(paramMessage, paramError);

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('should set message', () => {
    // assert
    expect(sut.message).toBe(
      `${paramMessage}. innerError: { name: '${paramError.name}', message: '${paramError.message}' }`,
    );
  });

  describe('NestedError', () => {
    it('Should return nestedError', () => {
      // assert
      expect(sut.NestedError).toBe(paramError);
    });
  });
});
