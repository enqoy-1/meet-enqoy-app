import { Module } from '@nestjs/common';
import { OutsideCityInterestsController } from './outside-city-interests.controller';
import { OutsideCityInterestsService } from './outside-city-interests.service';

@Module({
  controllers: [OutsideCityInterestsController],
  providers: [OutsideCityInterestsService],
})
export class OutsideCityInterestsModule {}
