import { Module } from '@nestjs/common';
import { DockerService } from './docker/docker.service';
import { DockerFactory } from './docker/docker.factory';
import { getConfigModuleImport } from './app.configuration';
import { CloudFlareService } from './cloud-flare/cloud-flare.service';

@Module({
  imports: [getConfigModuleImport()],
  providers: [DockerService, DockerFactory, CloudFlareService],
})
export class AppModule {}
