import type { DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';

/**
 *Due to the way that type resolution works in TypeScript 6 and golevelup/ts-jest.
 *
 * It no longer resolves the `get` method of the `ConfigService` correctly when using `DeepMocked<ConfigService>`.
 * This is a workaround to fix that issue by creating a new type that omits the `get` method and replaces it with a jest mock.
 */
export type MockedConfigService = Omit<DeepMocked<ConfigService>, 'get'> & {
  get: {
    (key: string): any;
    mockImplementation<O, K extends keyof O>(fn: (key: K) => O[K]): any;
  };
};
