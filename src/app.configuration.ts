import { ConfigModule } from '@nestjs/config';
import { readFileSync } from 'fs';
import Joi from 'joi';
import { NestedError } from './errors/nested-error';

// Joi validation schema for environment variables
export const validationSchema = Joi.object({
  PROJECT_LABEL: Joi.string()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .trim()
    .empty('')
    .default('docker-compose-external-dns'),
  INSTANCE_ID: Joi.string()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .trim()
    .empty('')
    .default('1'),
  API_TOKEN: Joi.string()
    .pattern(/^[A-Za-z0-9_]+$/)
    .min(10)
    .max(128)
    .trim()
    .empty(),
  API_TOKEN_FILE: Joi.string()
    .pattern(/^\/run\/secrets\/[A-Za-z0-9-_]+$/)
    .trim()
    .empty(),
}).xor('API_TOKEN', 'API_TOKEN_FILE');

// loads configuration which requires bespoke logic
export const customConfiguration = () => {
  // only run if API_TOKEN_FILE isn't undefined
  if (process.env.API_TOKEN_FILE === undefined) return {};
  try {
    // load the file
    const fileContent = readFileSync(process.env.API_TOKEN_FILE, {
      encoding: 'utf8',
    });
    // validate the contents
    const { error } = Joi.string()
      .pattern(/^[A-Za-z0-9_]+$/)
      .min(10)
      .max(128)
      .trim()
      .empty()
      .validate(fileContent);
    if (error !== undefined) {
      throw new NestedError(
        `app.configuration, customConfiguration: Failed validating ${process.env.API_TOKEN_FILE} as an API_TOKEN`,
        error,
      );
    }
    // return contents, overwrite API_TOKEN value
    return {
      API_TOKEN: fileContent,
    };
  } catch (error) {
    // if already caught, just re-throw
    if (error instanceof NestedError) throw error;
    // file system error
    throw new NestedError(
      `app.configuration, customConfiguration: Failed trying to read file ${process.env.API_TOKEN_FILE}`,
      error,
    );
  }
};

// ConfigModule import
export const getConfigModuleImport = () =>
  ConfigModule.forRoot({
    load: [customConfiguration],
    cache: false,
    ignoreEnvVars: false,
    ignoreEnvFile: true,
    validationSchema,
  });

// type definition for configuration
export interface IConfiguration {
  PROJECT_LABEL: string;
  INSTANCE_ID: string;
}
