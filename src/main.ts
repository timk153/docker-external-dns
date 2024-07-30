import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { CronService } from './cron/cron.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  const appService = app.get(AppService);
  const cronService = app.get(CronService);
  appService.initialize();
  cronService.start();
}
bootstrap();
