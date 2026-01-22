import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { EmailModule } from '../email/email.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [EmailModule, CreditsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule { }
