import { Module } from '@nestjs/common';
import { UsersController, AdminUsersController } from './users.controller';

@Module({
  controllers: [UsersController, AdminUsersController],
})
export class UsersModule {}
