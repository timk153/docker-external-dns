import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private helloWorld = 'Hello World!';

  getHello(): string {
    return this.helloWorld;
  }
}
