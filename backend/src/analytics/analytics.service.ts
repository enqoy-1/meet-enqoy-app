import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getEnhancedAnalytics(startDate?: Date, endDate?: Date) {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate || now;

    console.log('Backend received dates:', {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      start: start.toISOString(),
      end: end.toISOString()
    });

    // For date range queries, use "less than next day" instead of "less than or equal to end of day"
    // This avoids millisecond precision issues
    const endExclusive = new Date(end.getTime() + 1); // Add 1ms to make it exclusive upper bound

    console.log('Query will use:', {
      start: start.toISOString(),
      endExclusive: endExclusive.toISOString(),
      query: `createdAt >= ${start.toISOString()} AND createdAt < ${endExclusive.toISOString()}`
    });

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(start.getTime());
    const prevEndExclusive = new Date(prevEnd.getTime() + 1);

    // Fetch all needed data
    const [
      totalUsers,
      usersInPeriod,
      usersInPrevPeriod,
      profilesWithAssessment,
      profilesWithAssessmentInPeriod,
      allBookings,
      bookingsInPeriod,
      bookingsInPrevPeriod,
      cancelledBookings,
      cancelledInPeriod,
      allEvents,
      eventsInPeriod,
      eventsInPrevPeriod,
      allProfiles,
      allAssessments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: start, lt: endExclusive } } }),
      this.prisma.user.count({ where: { createdAt: { gte: prevStart, lt: prevEndExclusive } } }),
      this.prisma.profile.count({ where: { assessmentCompleted: true } }),
      this.prisma.profile.count({ where: { assessmentCompleted: true, createdAt: { gte: start, lt: endExclusive } } }),
      this.prisma.booking.findMany({ where: { status: 'confirmed' }, select: { userId: true, createdAt: true } }),
      this.prisma.booking.count({ where: { status: 'confirmed', createdAt: { gte: start, lt: endExclusive } } }),
      this.prisma.booking.count({ where: { status: 'confirmed', createdAt: { gte: prevStart, lt: prevEndExclusive } } }),
      this.prisma.booking.count({ where: { status: 'cancelled' } }),
      this.prisma.booking.count({ where: { status: 'cancelled', createdAt: { gte: start, lt: endExclusive } } }),
      this.prisma.event.findMany({ select: { id: true, capacity: true, venueId: true, createdAt: true } }),
      this.prisma.event.count({ where: { createdAt: { gte: start, lt: endExclusive } } }),
      this.prisma.event.count({ where: { createdAt: { gte: prevStart, lt: prevEndExclusive } } }),
      this.prisma.profile.findMany({ select: { gender: true, age: true, city: true, assessmentCompleted: true } }),
      this.prisma.personalityAssessment.findMany({ select: { userId: true, answers: true } }),
    ]);

    console.log('Query results:', {
      totalUsers,
      usersInPeriod,
      usersInPrevPeriod,
      bookingsInPeriod,
      eventsInPeriod
    });

    // ========== KPIs with Period Comparison ==========
    const kpis = {
      totalSignUps: totalUsers,
      signUpsInPeriod: usersInPeriod,
      signUpsChange: this.calculatePercentChange(usersInPeriod, usersInPrevPeriod),
      totalBookings: allBookings.length,
      bookingsInPeriod,
      bookingsChange: this.calculatePercentChange(bookingsInPeriod, bookingsInPrevPeriod),
      totalEvents: allEvents.length,
      eventsInPeriod,
      eventsChange: this.calculatePercentChange(eventsInPeriod, eventsInPrevPeriod),
    };

    // ========== Conversion Metrics ==========
    const usersWithBookings = new Set(allBookings.map(b => b.userId));
    const repeatBookers = Object.values(
      allBookings.reduce((acc, b) => {
        acc[b.userId] = (acc[b.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).filter(count => count > 1).length;

    const conversions = {
      signupToAssessment: {
        rate: totalUsers > 0 ? (profilesWithAssessment / totalUsers) * 100 : 0,
        completed: profilesWithAssessment,
        total: totalUsers,
      },
      assessmentToBooking: {
        rate: profilesWithAssessment > 0 ? (usersWithBookings.size / profilesWithAssessment) * 100 : 0,
        completed: usersWithBookings.size,
        total: profilesWithAssessment,
      },
      repeatBooking: {
        rate: usersWithBookings.size > 0 ? (repeatBookers / usersWithBookings.size) * 100 : 0,
        completed: repeatBookers,
        total: usersWithBookings.size,
      },
    };

    // ========== Event Performance ==========
    const totalCapacity = allEvents.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const totalCancellations = cancelledBookings + cancelledInPeriod; // Total cancelled
    const allBookingsTotal = await this.prisma.booking.count();

    // Get venue booking counts
    const venueBookings = await this.prisma.booking.groupBy({
      by: ['eventId'],
      where: { status: 'confirmed' },
      _count: true,
    });

    const eventVenues = await this.prisma.event.findMany({
      where: { id: { in: venueBookings.map(v => v.eventId) } },
      include: { venue: true },
    });

    const venueCountMap: Record<string, { name: string; count: number }> = {};
    for (const vb of venueBookings) {
      const event = eventVenues.find(e => e.id === vb.eventId);
      if (event?.venue) {
        const venueName = event.venue.name;
        if (!venueCountMap[venueName]) {
          venueCountMap[venueName] = { name: venueName, count: 0 };
        }
        venueCountMap[venueName].count += vb._count;
      }
    }

    const eventPerformance = {
      capacityUtilization: totalCapacity > 0 ? (allBookings.length / totalCapacity) * 100 : 0,
      totalCapacity,
      bookedSpots: allBookings.length,
      cancellationRate: allBookingsTotal > 0 ? (cancelledBookings / allBookingsTotal) * 100 : 0,
      cancelledCount: cancelledBookings,
      popularVenues: Object.values(venueCountMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };

    // ========== Demographics ==========
    const genderDistribution = this.calculateDistribution(
      allProfiles.filter(p => p.gender).map(p => p.gender as string)
    );

    const ageRanges = { '18-25': 0, '26-35': 0, '36-45': 0, '46+': 0 };
    allProfiles.forEach(p => {
      if (p.age) {
        if (p.age >= 18 && p.age <= 25) ageRanges['18-25']++;
        else if (p.age >= 26 && p.age <= 35) ageRanges['26-35']++;
        else if (p.age >= 36 && p.age <= 45) ageRanges['36-45']++;
        else if (p.age > 45) ageRanges['46+']++;
      }
    });
    const ageDistribution = Object.entries(ageRanges).map(([name, value]) => ({ name, value }));

    const cityBreakdown = this.calculateDistribution(
      allProfiles.filter(p => p.city).map(p => p.city as string)
    ).slice(0, 10);

    // Personality type distribution - need to categorize from assessment
    const personalityDistribution = await this.calculatePersonalityDistribution();

    const demographics = {
      genderDistribution,
      ageDistribution,
      cityBreakdown,
      personalityDistribution,
    };

    // ========== Trend Data ==========
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const granularity = daysDiff <= 7 ? 'day' : daysDiff <= 60 ? 'week' : 'month';

    const signUpTrend = await this.calculateTrend('user', start, end, granularity);
    const bookingTrend = await this.calculateTrend('booking', start, end, granularity);

    return {
      period: { start, end, granularity },
      kpis,
      conversions,
      eventPerformance,
      demographics,
      trends: {
        signUps: signUpTrend,
        bookings: bookingTrend,
      },
    };
  }

  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private calculateDistribution(items: string[]): { name: string; value: number }[] {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private async calculatePersonalityDistribution() {
    // Get all users with their category from assessment scores
    const assessments = await this.prisma.personalityAssessment.findMany({
      select: { answers: true },
    });

    const categories: Record<string, number> = {
      Trailblazers: 0,
      Storytellers: 0,
      Philosophers: 0,
      Planners: 0,
      'Free Spirits': 0,
    };

    for (const assessment of assessments) {
      const answers = assessment.answers as any;
      if (!answers) continue;

      // Simple categorization based on key answers
      const scores = this.scorePersonalityFromAnswers(answers);
      const category = this.getCategoryFromScores(scores);
      if (category) categories[category]++;
    }

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(c => c.value > 0);
  }

  private scorePersonalityFromAnswers(answers: any) {
    const scores = {
      Trailblazers: 0,
      Storytellers: 0,
      Philosophers: 0,
      Planners: 0,
      'Free Spirits': 0,
    };

    // Dinner vibe scoring
    if (answers.dinnerVibe === 'steering') {
      scores.Storytellers += 3;
      scores.Trailblazers += 2;
    } else if (answers.dinnerVibe === 'sharing') {
      scores.Storytellers += 3;
    } else if (answers.dinnerVibe === 'observing') {
      scores.Philosophers += 3;
      scores.Planners += 1;
    } else if (answers.dinnerVibe === 'adapting') {
      scores['Free Spirits'] += 3;
    }

    // Talk topic scoring
    if (answers.talkTopic === 'current_events') {
      scores.Philosophers += 2;
      scores.Planners += 1;
    } else if (answers.talkTopic === 'arts') {
      scores.Trailblazers += 2;
      scores.Storytellers += 1;
    } else if (answers.talkTopic === 'personal_growth') {
      scores.Philosophers += 3;
    } else if (answers.talkTopic === 'experiences') {
      scores.Trailblazers += 2;
      scores['Free Spirits'] += 1;
    } else if (answers.talkTopic === 'hobbies') {
      scores.Storytellers += 1;
      scores['Free Spirits'] += 1;
    }

    // Wardrobe style scoring
    if (answers.wardrobeStyle === 'classics') {
      scores.Planners += 2;
      scores.Philosophers += 1;
    } else if (answers.wardrobeStyle === 'trendy') {
      scores.Trailblazers += 3;
    }

    // Introvert scale
    const introvertScale = answers.introvertScale || 3;
    if (introvertScale >= 4) {
      scores.Philosophers += 2;
      scores.Planners += 1;
    } else if (introvertScale <= 2) {
      scores.Storytellers += 2;
      scores.Trailblazers += 1;
    }

    return scores;
  }

  private getCategoryFromScores(scores: Record<string, number>): string {
    let maxScore = 0;
    let category = 'Planners';
    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        category = cat;
      }
    }
    return category;
  }

  private async calculateTrend(
    type: 'user' | 'booking',
    start: Date,
    end: Date,
    granularity: 'day' | 'week' | 'month'
  ) {
    const endExclusive = new Date(end.getTime() + 1);
    const data = type === 'user'
      ? await this.prisma.user.findMany({
        where: { createdAt: { gte: start, lt: endExclusive } },
        select: { createdAt: true },
      })
      : await this.prisma.booking.findMany({
        where: { status: 'confirmed', createdAt: { gte: start, lt: endExclusive } },
        select: { createdAt: true },
      });

    const buckets: Record<string, number> = {};

    for (const item of data) {
      const date = new Date(item.createdAt);
      let key: string;

      if (granularity === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date.toISOString().substring(0, 7);
      }

      buckets[key] = (buckets[key] || 0) + 1;
    }

    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Keep existing methods
  async getOverview() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalEvents,
      totalBookings,
      eventsThisWeek,
      allBookings,
      allProfiles,
      allBookingsDetailed,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.event.count(),
      this.prisma.booking.count({ where: { status: 'confirmed' } }),
      this.prisma.event.count({ where: { startTime: { gte: weekStart } } }),
      this.prisma.booking.findMany({
        where: { status: 'confirmed' },
        select: { userId: true, createdAt: true },
      }),
      this.prisma.profile.findMany({ select: { id: true, createdAt: true } }),
      this.prisma.booking.findMany({
        where: { status: 'confirmed' },
        include: { event: { select: { title: true, eventType: true, id: true } }, user: { include: { profile: true } } },
      }),
    ]);

    const userBookingCounts = allBookings.reduce((acc, booking) => {
      acc[booking.userId] = (acc[booking.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatCustomers = Object.values(userBookingCounts).filter(count => count > 1).length;
    const uniqueCustomers = Object.keys(userBookingCounts).length;
    const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    const weeksBack = 8;
    const weeklySignUps = this.calculateWeeklyData(allProfiles, weeksBack);
    const weeklyBookings = this.calculateWeeklyData(allBookings, weeksBack);

    const thisWeekBookings = allBookingsDetailed.filter(b => new Date(b.createdAt) >= weekStart);
    const eventTypeCounts = thisWeekBookings.reduce((acc, b) => {
      const type = b.event?.eventType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topEventType = Object.entries(eventTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    const newUsersThisWeek = thisWeekBookings.filter(b => {
      const userAllBookings = allBookings.filter(booking => booking.userId === b.userId);
      return userAllBookings.length === 1;
    }).length;
    const returningUsersThisWeek = thisWeekBookings.length - newUsersThisWeek;

    return {
      eventsThisWeek,
      totalEvents,
      totalSignUps: totalUsers,
      totalBookings,
      repeatCustomers,
      repeatRate,
      weeklySignUps,
      weeklyBookings,
      topEventType,
      newVsReturning: [
        { name: 'New', value: newUsersThisWeek },
        { name: 'Returning', value: returningUsersThisWeek },
      ],
    };
  }

  private calculateWeeklyData(data: Array<{ createdAt: Date | string }>, weeksBack: number) {
    const now = new Date();
    const result = [];

    for (let i = 0; i < weeksBack; i++) {
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - (weeksBack - i) * 7);
      weekStartDate.setHours(0, 0, 0, 0);

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 7);

      const count = data.filter(item => {
        const date = new Date(item.createdAt);
        return date >= weekStartDate && date < weekEndDate;
      }).length;

      result.push({ weekStart: weekStartDate.toISOString().split('T')[0], count });
    }

    return result;
  }

  async getBookingStats() {
    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    });
    return bookingsByStatus.map(item => ({ status: item.status, count: item._count }));
  }

  async getEventStats() {
    const eventsByType = await this.prisma.event.groupBy({
      by: ['eventType'],
      _count: true,
    });
    return eventsByType.map(item => ({ type: item.eventType, count: item._count }));
  }

  async getUserGrowth() {
    const users = await this.prisma.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyData = users.reduce((acc, user) => {
      const month = user.createdAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData).map(([month, count]) => ({ month, count }));
  }

  async getRecentActivity() {
    const activities = [];

    const recentEvents = await this.prisma.event.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });
    recentEvents.forEach(e => {
      activities.push({ type: 'event', timestamp: e.createdAt, title: `Event created: ${e.title}`, link: '/admin/events' });
    });

    const recentProfiles = await this.prisma.profile.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    });
    recentProfiles.forEach(p => {
      activities.push({ type: 'signup', timestamp: p.createdAt, title: `New signup: ${p.firstName} ${p.lastName}`, link: '/admin/users' });
    });

    const recentBookings = await this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { include: { profile: true } }, event: { select: { title: true, id: true } } },
    });
    recentBookings.forEach(b => {
      activities.push({
        type: 'booking',
        timestamp: b.createdAt,
        title: `${b.user.profile?.firstName} ${b.user.profile?.lastName} booked ${b.event.title}`,
        link: '/admin/events',
      });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }
}
