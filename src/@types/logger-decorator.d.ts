declare module 'logger-decorator' {
  /**
   * Sanitise based on a regular expression.
   * @param regexp Regular expression when if matched, the data is sanitized with ***
   */
  declare function sanitizeRegexp(regexp: RegExp): Sanitizer;

  /**
   * Possible log levels
   */
  type LogLevels = 'trace' | 'debug' | 'info' | 'warn' | 'error';

  /**
   * Logs out the data passed
   */
  type Logger = (logLevel: LogLevels, data: any) => void;

  /**
   * The common type for specifying the log level
   */
  type LogLevel = ((...args: any[]) => LogLevels) | LogLevels;

  /**
   * The common type for sanitization
   */
  type Sanitizer = (...data: any[]) => string | string[];

  /**
   * Can be passed when using the decorator.
   * As well as when the instance is constructed.
   */
  type DecoratorConfig = {
    /**
     * if set to true, timestamps will be added to all logs.
     * False by default
     */
    timestamp?: boolean;

    /**
     * the default log-level; pay attention that the logger must support it as logger.level(smth), 'info' by default.
     * Also, a function could be passed. The function will receive logged data and should return the log-level as a string.
     */
    level?: LogLevel;

    /**
     * the level used for errors; 'error' by default. Also, a function could be passed.
     * The function will receive logged data and should return the log-level as a string.
     */
    errorLevel?: LogLevel;

    /**
     * the level used for logging params.
     * Logger will print input params before the function starts executing. Also, a function could be passed.
     * The function will receive logged data and should return the log-level as a string. If omitted, nothing will be logged before execution.
     */
    paramsLevel?: LogLevel;

    /**
     * if set to true, the logger will catch only errors.
     * default is false.
     */
    errorsOnly?: boolean;

    /**
     * Child options available
     */
    logErrors?: {
      /**
       * log only th;e deepest occurrence of the error. This option prevents 'error spam.'
       * Default is false
       */
      deepest?: boolean;
    };

    /**
     * function to sanitize input parameters for logging.
     *
     * simpleSanitiser can be used, writes out using util.inspect for Node:
     * htps://nodejs.org/api/util.html#util_util_inspect_object_options
     *
     * dataSanitiser can also be used and is set by default.
     * dataSanitiser looks for anything matching the regular expression /password/ and replace it with ***
     *
     * Recommended to write your own for your specific use case.
     *
     * @param data Data being logged out
     * @returns Sanitized data for logging (array if input is array else string)
     */
    paramsSanitizer?: Sanitizer;

    /**
     * function to sanitize output for logging.
     *
     * simpleSanitiser can be used, writes out using util.inspect for Node:
     * htps://nodejs.org/api/util.html#util_util_inspect_object_options
     *
     * dataSanitiser can also be used and is set by default.
     * dataSanitiser looks for anything matching the regular expression /password/ and replace it with ***
     *
     * Recommended to write your own for your specific use case.
     *
     * @param data Data being logged out
     * @returns Sanitized data for logging (array if input is array else string)
     */
    resultSanitizer?: Sanitizer;

    /**
     * function to sanitize errors for logging.
     *
     * simpleSanitiser can be used and is use by default. writes out using util.inspect for Node:
     * htps://nodejs.org/api/util.html#util_util_inspect_object_options
     *
     * dataSanitiser can also be used.
     * dataSanitiser looks for anything matching the regular expression /password/ and replace it with ***
     *
     * Recommended to write your own for your specific use case.
     *
     * @param data Data being logged out
     * @returns Sanitized data for logging (array if input is array else string)
     */
    errorSanitizer?: Sanitizer;

    /**
     * function to sanitize function context.
     * function context is an optional parameter supplied to the decorator for the function being logged.
     *
     * simpleSanitiser can be used. writes out using util.inspect for Node:
     * htps://nodejs.org/api/util.html#util_util_inspect_object_options
     *
     * dataSanitiser can also be used.
     * dataSanitiser looks for anything matching the regular expression /password/ and replace it with ***
     *
     * Recommended to write your own for your specific use case.
     *
     * IMPORTANT, no default, if ommited no context is written out.
     *
     * @param data Data being logged out
     * @returns Sanitized data for logging (array if input is array else string)
     */
    contextSanitizer?: Sanitizer;

    /**
     * if set to true, it is possible to use multiple decorators at once.
     * Default is false
     */
    duplicates?: boolean;

    /**
     * if logger-decorator is used with other decorators, they can set own reflect metadata.
     * By passing keepReflectMetadata array, you can prevent metadata from resetting.
     * For example, for NestJS, it's a good idea to use { keepReflectMetadata: ['method', 'path'] }.
     */
    keepReflectMetadata?: string[];

    /**
     * if set to true, getters will also be logged (applied to class and class-method decorators).
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
     */
    getters?: boolean;

    /**
     * if set to true, setters will also be logged (applied to class and class-method decorators).
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set
     */
    setters?: boolean;

    /**
     * if set to true, class-properties will also be logged (applied to class decorators only).
     * https://babeljs.io/docs/en/babel-plugin-proposal-class-properties
     */
    classProperties?: boolean;

    /**
     * array with method names for which logs will be added.
     */
    include?: string[];

    /**
     * array with method names for which logs won't be added.
     */
    exclude?: string[];

    /**
     * function to filter method names.
     * default omits constructor but logs everything else.
     *
     * @param name name of method
     * @returns true to include in logs else false
     */
    methodNameFilter?: (name: string) => boolean;
  };

  type Configuration = {
    /**
     * Either a single logging function for every level.
     * Or a map of requested level to logger to use.
     *
     * https://github.com/pustovitDmytro/logger-decorator?tab=readme-ov-file#logger
     *
     * For example:
     * logger: (logLevel, data) => console.log(data) // everything written out to log regardless of level
     *
     * Or
     *
     * logger: {
     *   trace: console.trace,
     *   info: console.log
     * }
     *
     * Uses console.log by default if omited
     */
    logger?: Logger | { [logLevel: string]: Logger };

    /**
     * the app name to include in all logs; it could be omitted.
     */
    name?: string;
  } & DecoratorConfig;

  type DecoratorConstructor = {
    //  eslint-disable-next-line prettier/prettier
    new(config?: Configuration): (config?: DecoratorConfig) => ClassDecorator;
  };

  function DecoratorFunction(config?: Configuration);
  export const Decorator = DecoratorFunction as DecoratorConstructor;
}
