import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmModuleOptions } from './config/typeorm';
import configuration from './config/configuration';
import { UserModule } from './resources/user/user.module';
import { AuthModule } from './resources/auth/auth.module';
import { CacheModule } from './resources/cache/cache.module';
import { AssistantModule } from './resources/assistant/assistant.module';
import { WorkflowModule } from './resources/workflow/workflow.module';
import { TaskModule } from './resources/task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRoot(typeOrmModuleOptions),
    UserModule,
    AuthModule,
    CacheModule,
    AssistantModule,
    WorkflowModule,
    TaskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
