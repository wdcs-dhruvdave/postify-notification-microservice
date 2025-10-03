import { Injectable } from '@nestjs/common';
import { MESSAGES } from './common/constants/constants';

@Injectable()
export class AppService {
  getHello(): string {
    return MESSAGES.SERVICE.HELLO_WORLD;
  }
}
