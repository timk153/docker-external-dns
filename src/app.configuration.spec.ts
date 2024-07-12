import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import each from 'jest-each';
import { getConfigModuleImport } from './app.configuration';

describe('App Configuration', () => {
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

  each([
    ['project-label1', 'tag-value2'],
    ['project_label1', 'tag_value2'],
    ['projectLabel1', 'tagValue2'],
    ['ProjectLabel1', 'TagValue2'],
  ]).it(
    'should validate: { label: "%p", tag: "%p" }',
    async (projectLabel, tagValue) => {
      // arrange
      process.env.PROJECT_LABEL = projectLabel;
      process.env.TAG_VALUE = tagValue;

      // act
      const sut = await getSystemUnderTest();

      // assert
      expect(sut.get('PROJECT_LABEL', { infer: true })).toEqual(
        process.env.PROJECT_LABEL,
      );
      expect(sut.get('TAG_VALUE', { infer: true })).toEqual(
        process.env.TAG_VALUE,
      );
    },
  );

  each([
    ['project&label', 'tag#value'],
    ['<project>-(label)', '{tag}_%value%'],
  ]).it(
    'should invalidate: { label: "%p", tag: "%p" }',
    async (projectLabel, tagValue) => {
      // arrange
      process.env.PROJECT_LABEL = projectLabel;
      process.env.TAG_VALUE = tagValue;

      // act / assert
      await expect(async () => getSystemUnderTest()).rejects.toThrow();
    },
  );

  it('should use defaults when values are undefined', async () => {
    // arrange
    delete process.env.PROJECT_LABEL;
    delete process.env.TAG_VALUE;

    // act
    const sut = await getSystemUnderTest();

    // act
    expect(sut.get('PROJECT_LABEL', { infer: true })).toEqual(
      'docker-compose-external-dns',
    );
    expect(sut.get('TAG_VALUE', { infer: true })).toEqual('1');
  });

  each(['', '     ']).it(
    `should use defaults when values are empty, value: "%p"`,
    async (element) => {
      // arrange
      process.env.PROJECT_LABEL = element;
      process.env.TAG_VALUE = element;

      // act
      const sut = await getSystemUnderTest();

      // assert
      expect(sut.get('PROJECT_LABEL', { infer: true })).toEqual(
        'docker-compose-external-dns',
      );
      expect(sut.get('TAG_VALUE', { infer: true })).toEqual('1');
    },
  );
});
