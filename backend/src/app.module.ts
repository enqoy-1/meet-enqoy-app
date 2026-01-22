import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { VenuesModule } from './venues/venues.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { IcebreakersModule } from './icebreakers/icebreakers.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { PairingModule } from './pairing/pairing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FeedbackModule } from './feedback/feedback.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { OutsideCityInterestsModule } from './outside-city-interests/outside-city-interests.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { FriendInvitationsModule } from './friend-invitations/friend-invitations.module';
import { PaymentModule } from './payment/payment.module';
import { SettingsModule } from './settings/settings.module';
import { CreditsModule } from './credits/credits.module';
import { CountriesModule } from './countries/countries.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    BookingsModule,
    VenuesModule,
    AssessmentsModule,
    IcebreakersModule,
    AnnouncementsModule,
    PairingModule,
    AnalyticsModule,
    FeedbackModule,
    SnapshotsModule,
    OutsideCityInterestsModule,
    SandboxModule,
    FriendInvitationsModule,
    PaymentModule,
    SettingsModule,
    CreditsModule,
    CountriesModule,
  ],
})
export class AppModule { }
