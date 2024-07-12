/**
 * Encapsulates an error and overrides the message.
 * Allows for nested error stacks.
 */
export class NestedError<T extends Error> extends Error {
  constructor(
    message: string,
    private nestedError: T,
  ) {
    super(
      `${message}. innerError: { name: '${nestedError.name}', message: '${nestedError.message}' }`,
    );
  }

  /**
   * Exposes the nested error
   * @returns { T } Nested error
   */
  get NestedError(): T {
    return this.nestedError;
  }
}
