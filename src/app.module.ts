import { Module } from '@nestjs/common';
import { DockerService } from './docker/docker.service';
import { DockerFactory } from './docker/docker.factory';
import { CloudFlareService } from './cloud-flare/cloud-flare.service';
import { CloudFlareFactory } from './cloud-flare/cloud-flare.factory';
import { AppService } from './app.service';
import { ConsoleLoggerService } from './logger.service';
import { DdnsService } from './ddns/ddns.service';

/**
 * Module that registers all the services and factories for the application
 */
@Module({
  providers: [
    DockerService,
    DockerFactory,
    CloudFlareService,
    CloudFlareFactory,
    AppService,
    ConsoleLoggerService,
    DdnsService,
  ],
})
export class AppModule {}
