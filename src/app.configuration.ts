import { ConfigModule } from '@nestjs/config';
import { readFileSync } from 'fs';
import Joi from 'joi';
import { NestedError } from './errors/nested-error';

// Joi validation schema for environment variables
export const validationSchema = Joi.object({
  PROJECT_LABEL: Joi.string()
    .pattern(/^[A-Za-z0-9-_.]+$/)
    .trim()
    .empty('')
    .default('docker-compose-external-dns'),
  INSTANCE_ID: Joi.string()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .trim()
    .empty('')
    .default('1'),
  EXECUTION_FREQUENCY_SECONDS: Joi.number()
    .integer()
    .min(1)
    .empty('')
    .default(60),
  DDNS_EXECUTION_FREQUENCY_MINUTES: Joi.number()
    .integer()
    .min(1)
    .empty('')
    .default(60),
  PRESERVE_STOPPED: Joi.boolean().default(false),
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
  LOG_LEVEL: Joi.string()
    .trim()
    .empty('')
    .default('error')
    .allow('log', 'error', 'warn', 'debug', 'verbose', 'fatal'),
}).xor('API_TOKEN', 'API_TOKEN_FILE');

/**
 * Loads the configuration api token file whilst the configuration is being loaded.
 * Details can be found here: https://docs.nestjs.com/techniques/configuration
 * @throws {NestedError} if API_TOKEN fails to validate
 * @throws {NestedError} if unable to read and validate value present in API_TOKEN_FILE
 * @returns Segment of configuration to be made available by NestJS ConfigService
 */
export const loadConfigurationApiTokenFile = () => {
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
      API_TOKEN: fileContent.trim(),
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

/**
 * Dynamically computes configuration entries from other configuration entries.
 * @returns Composed configuration values to be accessible from ConfigService
 */
export const loadConfigurationComposedConstants = () => {
  const { PROJECT_LABEL, INSTANCE_ID } = process.env;
  return {
    ENTRY_IDENTIFIER: `${PROJECT_LABEL}:${INSTANCE_ID}`,
  };
};

/**
 * Configures the ConfigModule for NestJS to load dynamic configuration values and validate them.
 * @returns ConfigModule import configuration for NestJS.
 */
export const getConfigModuleImport = () =>
  ConfigModule.forRoot({
    load: [loadConfigurationApiTokenFile, loadConfigurationComposedConstants],
    cache: false,
    ignoreEnvVars: false,
    ignoreEnvFile: true,
    validationSchema,
  });

// type definition for configuration
export interface IConfiguration {
  PROJECT_LABEL: string;
  INSTANCE_ID: string;
  ENTRY_IDENTIFIER: string;
  PRESERVE_STOPPED: boolean;
}
