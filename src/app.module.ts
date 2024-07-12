import { Module } from '@nestjs/common';
import { DockerService } from './docker/docker.service';
import { DockerFactory } from './docker/docker-factory';
import { getConfigModuleImport } from './app.configuration';

@Module({
  imports: [getConfigModuleImport()],
  providers: [DockerService, DockerFactory],
})
export class AppModule {}
