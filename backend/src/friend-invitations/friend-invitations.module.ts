import { Module } from '@nestjs/common';
import { FriendInvitationsController } from './friend-invitations.controller';
import { FriendInvitationsService } from './friend-invitations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FriendInvitationsController],
  providers: [FriendInvitationsService],
  exports: [FriendInvitationsService],
})
export class FriendInvitationsModule {}
