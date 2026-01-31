import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
    // Global rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 10,   // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minute
        limit: 100,  // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000,  // 1000 requests per hour
      },
    ]),
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
  providers: [
    // Enable rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
