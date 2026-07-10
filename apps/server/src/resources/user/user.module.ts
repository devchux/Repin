import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SelfOrSuperUserGuard } from '../auth/guards/self-or-super-user.guard';
import { SuperUserGuard } from '../auth/guards/super-user.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.register({})],
  controllers: [UserController],
  providers: [UserService, SelfOrSuperUserGuard, SuperUserGuard],
  exports: [UserService],
})
export class UserModule {}
