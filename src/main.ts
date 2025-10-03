import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CONFIG, MESSAGES } from './common/constants/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || CONFIG.SERVER.DEFAULT_PORT;

  await app.listen(port);
  console.log(`${MESSAGES.LOG.SERVER_STARTUP} ${await app.getUrl()}`);
}
void bootstrap();
