import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

// Joi validation schema for environment variables
export const validationSchema = Joi.object({
  PROJECT_LABEL: Joi.string()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .trim()
    .empty('')
    .default('docker-compose-external-dns'),
  TAG_VALUE: Joi.string()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .trim()
    .empty('')
    .default('1'),
});

// ConfigModule import
export const getConfigModuleImport = () =>
  ConfigModule.forRoot({
    cache: false,
    ignoreEnvVars: false,
    ignoreEnvFile: true,
    validationSchema,
  });

// type definition for configuration
export interface IConfiguration {
  PROJECT_LABEL: string;
  TAG_VALUE: string;
}
