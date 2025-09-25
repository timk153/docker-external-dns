import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { getConfigModuleImport } from './app.configuration';
import { ConsoleLoggerService } from './logger.service';

/**
 * Main application bootstrap!
 * Initializes the NestJS application.
 * Initializes the application services.
 * Starts the CRON job to synchronise the DNS entries.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    { module: AppModule, imports: [getConfigModuleImport()] },
    {
      bufferLogs: true,
    },
  );
  app.useLogger(await app.resolve(ConsoleLoggerService));
  app.enableShutdownHooks();
  const appService = app.get(AppService);
  appService.initialize();
  appService.start();
}
bootstrap();
