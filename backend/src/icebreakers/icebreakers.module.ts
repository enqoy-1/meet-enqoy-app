import { Module } from '@nestjs/common';
import { IcebreakersController } from './icebreakers.controller';
import { IcebreakersService } from './icebreakers.service';

@Module({
  controllers: [IcebreakersController],
  providers: [IcebreakersService],
  exports: [IcebreakersService],
})
export class IcebreakersModule {}
