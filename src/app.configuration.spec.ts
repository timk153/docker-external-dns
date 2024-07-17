import { readFileSync } from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import each from 'jest-each';
import { getConfigModuleImport } from './app.configuration';
import * as ConfigurationModule from './app.configuration';
import { NestedError } from './errors/nested-error';

jest.mock('fs');

const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;
const mockReadFileSyncValue = 'valid_api_token_response';

describe('App Configuration', () => {
  const apiTokenInvalidTestCases = [
    '', // empty
    '           ', // empty
    'abcd_FG32', // too short
    'ab_dEFghij cb', // space
    'ab_dEFghij  cb', // tab
    'ab_dEFghij%cb', // symbol
    'JUlKWclrbFlLGdDAo57KUmvoJAV0VcudsJrga62NMfxV8UoTn_VoHDuuJ3VNXiGIVlg4z7KZScbdaYnyL12CLZ1h2GcG0drQXc17xnrAlRyDOKcwNGO3zkGlwD4NA6TPq', // too long
    `ab_dEFghij
      klmnop`, // line feed
  ];

  beforeAll(() => {
    mockReadFileSync.mockReturnValue(mockReadFileSyncValue);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Similar to beforeEach buy has to occur as act to force the module to load.
   * @returns {ConfigService} config service
   */
  async function getSystemUnderTest() {
    const app: TestingModule = await Test.createTestingModule({
      imports: [getConfigModuleImport()],
    }).compile();

    return app.get<ConfigService>(ConfigService);
  }

  function setEnvironmentVariable(key: string, value: string | undefined) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  each([
    ['project-label1', 'instance-id2', mockReadFileSyncValue, undefined],
    [
      'project_label1',
      'instance-id2',
      undefined,
      '/run/secrets/API_TOKEN_FILE',
    ],
  ]).it(
    'should validate: { PROJECT_LABEL: "%p", INSTANCE_ID: "%p", API_TOKEN: "%p", API_TOKEN_FILE: "%p" }',
    async (projectLabel, instanceId, apiToken, apiTokenFile) => {
      // arrange

      // ensures the custom configuration isn't parsed as this mutates the configuration
      // and has behaviour associated with specific values being set.
      const spyCustomConfiguration = jest
        .spyOn(ConfigurationModule, 'customConfiguration')
        .mockReturnValue({});

      process.env.PROJECT_LABEL = projectLabel;
      process.env.INSTANCE_ID = instanceId;
      setEnvironmentVariable('API_TOKEN', apiToken);
      setEnvironmentVariable('API_TOKEN_FILE', apiTokenFile);

      // act
      const sut = await getSystemUnderTest();

      // assert
      expect(sut.get('PROJECT_LABEL', { infer: true })).toEqual(
        process.env.PROJECT_LABEL,
      );
      expect(sut.get('INSTANCE_ID', { infer: true })).toEqual(
        process.env.INSTANCE_ID,
      );
      expect(sut.get('API_TOKEN', { infer: true })).toEqual(
        process.env.API_TOKEN,
      );
      expect(sut.get('API_TOKEN_FILE', { infer: true })).toEqual(
        process.env.API_TOKEN_FILE,
      );

      // clean up
      spyCustomConfiguration.mockRestore();
    },
  );

  each([
    ['project&label', 'valid', mockReadFileSyncValue, undefined],
    ['valid', '{tag}_%value%', mockReadFileSyncValue, undefined],
    ['valid', 'valid', undefined, 'invalid'],
    ['valid', 'valid', undefined, undefined],
    ['valid', 'valid', undefined, ''],
    ['valid', 'valid', undefined, '   '],
    ['valid', 'valid', apiTokenInvalidTestCases[0], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[1], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[2], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[3], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[4], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[5], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[6], undefined],
    ['valid', 'valid', apiTokenInvalidTestCases[7], undefined],
  ]).it(
    'should invalidate: { PROJECT_LABEL: "%p", INSTANCE_ID: "%p", API_TOKEN: "%p", API_TOKEN_FILE: "%p" }',
    async (projectLabel, instanceId, apiToken, apiTokenFile) => {
      // arrange
      process.env.PROJECT_LABEL = projectLabel;
      process.env.INSTANCE_ID = instanceId;
      setEnvironmentVariable('API_TOKEN', apiToken);
      setEnvironmentVariable('API_TOKEN_FILE', apiTokenFile);

      // act / assert
      await expect(async () => getSystemUnderTest()).rejects.toThrow();
    },
  );

  it('should use defaults when values are undefined', async () => {
    // arrange
    delete process.env.PROJECT_LABEL;
    delete process.env.INSTANCE_ID;
    process.env.API_TOKEN = mockReadFileSyncValue;

    // act
    const sut = await getSystemUnderTest();

    // act
    expect(sut.get('PROJECT_LABEL', { infer: true })).toEqual(
      'docker-compose-external-dns',
    );
    expect(sut.get('INSTANCE_ID', { infer: true })).toEqual('1');
  });

  each(['', '     ']).it(
    `should use defaults when values are empty, value: "%p"`,
    async (element) => {
      // arrange
      process.env.PROJECT_LABEL = element;
      process.env.INSTANCE_ID = element;
      process.env.API_TOKEN = mockReadFileSyncValue;

      // act
      const sut = await getSystemUnderTest();

      // assert
      expect(sut.get('PROJECT_LABEL', { infer: true })).toEqual(
        'docker-compose-external-dns',
      );
      expect(sut.get('INSTANCE_ID', { infer: true })).toEqual('1');
    },
  );

  describe('customConfiguration', () => {
    const envApiTokenFile = '/run/secrets/API_TOKEN_FILE';

    beforeEach(() => {
      delete process.env.API_TOKEN;
      process.env.API_TOKEN_FILE = envApiTokenFile;
    });

    it('should load API_TOKEN from API_TOKEN_FILE', async () => {
      // act
      const sut = await getSystemUnderTest();

      // assert
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(mockReadFileSync).toHaveBeenCalledWith(envApiTokenFile, {
        encoding: 'utf8',
      });
      expect(sut.get('API_TOKEN', { infer: true })).toBe(mockReadFileSyncValue);
    });

    it("should error if API_TOKEN_FILE doesn't resolve to a file", async () => {
      // arrange
      const error = new Error('file-read-error');
      mockReadFileSync.mockImplementationOnce(() => {
        throw error;
      });

      const expected = new NestedError(
        `app.configuration, customConfiguration: Failed trying to read file ${envApiTokenFile}`,
        error,
      );

      // act / assert
      await expect(async () => getSystemUnderTest()).rejects.toThrow(expected);
    });

    each([
      '', // empty
      '           ', // empty
      'abcd_FG32', // too short
      'ab_dEFghij cb', // space
      'ab_dEFghij  cb', // tab
      'ab_dEFghij%cb', // symbol
      'JUlKWclrbFlLGdDAo57KUmvoJAV0VcudsJrga62NMfxV8UoTn_VoHDuuJ3VNXiGIVlg4z7KZScbdaYnyL12CLZ1h2GcG0drQXc17xnrAlRyDOKcwNGO3zkGlwD4NA6TPq', // too long
      `ab_dEFghij
      klmnop`, // line feed
    ]).it(
      'should error if API_TOKEN_FILE contents is invalid (%p)',
      async (fileContents) => {
        // arrange
        mockReadFileSync.mockReturnValueOnce(fileContents);

        // act / assert
        await expect(async () => getSystemUnderTest()).rejects.toThrow(
          `app.configuration, customConfiguration: Failed validating ${envApiTokenFile} as an API_TOKEN`,
        );
      },
    );
  });
});
