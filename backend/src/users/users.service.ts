import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PairingAlgorithmService, PersonalityCategory } from '../pairing/pairing-algorithm.service';

interface UserFilters {
  startDate?: Date;
  endDate?: Date;
  assessment?: 'all' | 'completed' | 'pending';
  gender?: string;
  city?: string;
  hasBookings?: 'all' | 'yes' | 'no';
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private pairingAlgorithm: PairingAlgorithmService,
  ) { }

  async findAllFiltered(filters: UserFilters = {}) {
    // Build where clause
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Get users with all related data
    const users = await this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        roles: true,
        bookings: {
          where: { status: 'confirmed' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            event: {
              select: {
                eventType: true,
                title: true,
                startTime: true,
              }
            },
          },
        },
        personalityAssessment: {
          select: { answers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all unique cities for filter dropdown
    const allCities = await this.prisma.profile.findMany({
      where: { city: { not: null } },
      select: { city: true },
      distinct: ['city'],
    });
    const cities = allCities.map(p => p.city).filter(Boolean) as string[];

    // Transform and filter users
    let transformedUsers = users.map(({ password, profile, bookings, personalityAssessment, ...user }) => {
      // Calculate personality category from assessment
      let personalityType: string | null = null;
      if (personalityAssessment?.answers) {
        const scores = this.scorePersonalityFromAnswers(personalityAssessment.answers as any);
        personalityType = this.getCategoryFromScores(scores);
      }

      // Calculate booking frequency (bookings per month since first booking)
      let bookingFrequency: string = 'none';
      let avgPerMonth = 0;
      let monthsActive = 0;

      if (bookings.length > 0) {
        const sortedBookings = [...bookings].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const firstBooking = new Date(sortedBookings[0].createdAt);
        const now = new Date();
        monthsActive = Math.max(1,
          (now.getFullYear() - firstBooking.getFullYear()) * 12 +
          (now.getMonth() - firstBooking.getMonth()) + 1
        );
        avgPerMonth = bookings.length / monthsActive;

        if (avgPerMonth >= 2) bookingFrequency = 'frequent';      // 2+ per month
        else if (avgPerMonth >= 0.5) bookingFrequency = 'regular'; // 1-2 per month  
        else bookingFrequency = 'occasional';                      // less than 1 per month
      }

      // Calculate favorite event type (most booked)
      const eventTypeCounts: Record<string, number> = {};
      bookings.forEach(b => {
        const type = b.event?.eventType || 'unknown';
        eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
      });

      let favoriteEventType: { type: string; count: number; percentage: number } | null = null;
      if (bookings.length > 0) {
        const sorted = Object.entries(eventTypeCounts).sort(([, a], [, b]) => b - a);
        if (sorted.length > 0) {
          const [type, count] = sorted[0];
          favoriteEventType = {
            type,
            count,
            percentage: Math.round((count / bookings.length) * 100)
          };
        }
      }

      // Get latest booking (most recent by creation date)
      const latestBooking = bookings.length > 0
        ? [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;

      // Check if user has any upcoming events (event startTime is in the future)
      const now = new Date();
      const hasUpcomingEvent = bookings.some(b => new Date(b.event.startTime) > now);

      // Determine upcoming event status
      const upcomingBookings = bookings.filter(b => new Date(b.event.startTime) > now);
      let upcomingEventStatus: "confirmed" | "pending" | "none" = "none";
      if (upcomingBookings.length > 0) {
        const hasConfirmed = upcomingBookings.some(b => b.status === "confirmed");
        const hasPending = upcomingBookings.some(b => b.status === "pending");
        upcomingEventStatus = hasConfirmed ? "confirmed" : (hasPending ? "pending" : "confirmed");
      }

      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        fullName: profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : profile?.firstName || user.email.split('@')[0],
        phone: profile?.phone || null,
        age: profile?.age || null,
        gender: profile?.gender || null,
        city: profile?.city || null,
        assessmentCompleted: profile?.assessmentCompleted || false,
        eventCredits: profile?.eventCredits || 0,
        bookingsCount: bookings.length,
        bookingFrequency,
        avgPerMonth: Math.round(avgPerMonth * 10) / 10, // 1 decimal place
        favoriteEventType, // { type, count, percentage } or null
        lastBooking: latestBooking ? latestBooking.createdAt : null,
        lastBookingEvent: latestBooking ? {
          title: latestBooking.event.title,
          eventType: latestBooking.event.eventType,
          startTime: latestBooking.event.startTime,
        } : null,
        hasUpcomingEvent,
        upcomingEventStatus,
        personalityType,
        roles: user.roles,
      };
    });

    // Apply additional filters
    if (filters.assessment && filters.assessment !== 'all') {
      transformedUsers = transformedUsers.filter(u =>
        filters.assessment === 'completed' ? u.assessmentCompleted : !u.assessmentCompleted
      );
    }

    if (filters.gender && filters.gender !== 'all') {
      transformedUsers = transformedUsers.filter(u =>
        u.gender?.toLowerCase() === filters.gender?.toLowerCase()
      );
    }

    if (filters.city && filters.city !== 'all') {
      transformedUsers = transformedUsers.filter(u =>
        u.city?.toLowerCase() === filters.city?.toLowerCase()
      );
    }

    if (filters.hasBookings && filters.hasBookings !== 'all') {
      transformedUsers = transformedUsers.filter(u =>
        filters.hasBookings === 'yes' ? u.bookingsCount > 0 : u.bookingsCount === 0
      );
    }

    // Calculate summary stats
    const totalUsers = transformedUsers.length;
    const withAssessment = transformedUsers.filter(u => u.assessmentCompleted).length;
    const withBookings = transformedUsers.filter(u => u.bookingsCount > 0).length;
    const newThisPeriod = filters.startDate
      ? transformedUsers.filter(u => new Date(u.createdAt) >= filters.startDate!).length
      : totalUsers;

    return {
      users: transformedUsers,
      summary: {
        total: totalUsers,
        withAssessment,
        assessmentRate: totalUsers > 0 ? (withAssessment / totalUsers) * 100 : 0,
        withBookings,
        bookingRate: totalUsers > 0 ? (withBookings / totalUsers) * 100 : 0,
        newThisPeriod,
      },
      filterOptions: {
        cities,
      },
    };
  }

  private scorePersonalityFromAnswers(answers: any): Record<string, number> {
    const scores: Record<string, number> = {
      Trailblazers: 0,
      Storytellers: 0,
      Philosophers: 0,
      Planners: 0,
      'Free Spirits': 0,
    };

    // talkTopic - 2x weight - handle both full and short format
    const talkTopic = answers.talkTopic;
    if (talkTopic === 'Current events and world issues' || talkTopic === 'current_events') {
      scores.Philosophers += 1;
      scores.Planners += 3; // Boosted from 1 to 3 to help Planners
    } else if (talkTopic === 'Arts, entertainment, and pop culture' || talkTopic === 'arts_entertainment') {
      scores.Storytellers += 2;
      scores['Free Spirits'] += 2;
    } else if (talkTopic === 'Personal growth and philosophy' || talkTopic === 'personal_growth') {
      scores.Philosophers += 3;
    } else if (talkTopic === 'Food, travel, and experiences' || talkTopic === 'food_travel') {
      scores.Trailblazers += 2;
      scores['Free Spirits'] += 2; // Boosted Free Spirits
    } else if (talkTopic === 'Hobbies and niche interests' || talkTopic === 'hobbies') {
      scores.Trailblazers += 2;
      scores.Storytellers += 2;
    }

    // groupDynamic - 2x weight - handle both full and short format
    const groupDynamic = answers.groupDynamic;
    if (groupDynamic === 'A mix of people with shared interests and similar personalities' || groupDynamic === 'similar') {
      scores.Storytellers += 2;
      scores.Planners += 2;
      scores.Philosophers += 2;
    } else if (groupDynamic === 'A diverse group with different viewpoints and experiences' || groupDynamic === 'diverse') {
      scores.Trailblazers += 2;
      scores['Free Spirits'] += 2;
    }

    // dinnerVibe - 3x weight (most important)
    const dinnerVibe = answers.dinnerVibe;
    if (dinnerVibe === 'steering') {
      scores.Storytellers += 6;  // 2 * 3
      scores.Trailblazers += 3;
    } else if (dinnerVibe === 'sharing') {
      scores.Storytellers += 3;
    } else if (dinnerVibe === 'observing') {
      scores.Philosophers += 4;
      scores.Planners += 4;      // Boosted from 1 to 4 (major boost to verify Planner viability)
    } else if (dinnerVibe === 'adapting') {
      scores['Free Spirits'] += 6;  // 2 * 3 (Strong Free Spirit signal)
    }

    // humorType - 1x weight - handle both full and short format
    const humorType = answers.humorType;
    if (humorType === 'sarcastic') {
      scores.Storytellers += 1;
    } else if (humorType === 'playful' || humorType === 'lighthearted') {
      scores.Storytellers += 1;
      scores['Free Spirits'] += 1;
      scores.Trailblazers += 1;
    } else if (humorType === 'witty' || humorType === 'clever' || humorType === 'dry') {
      scores.Philosophers += 1;
      scores.Storytellers += 1;
    } else if (humorType === 'not_a_fan' || humorType === 'none') {
      scores.Philosophers += 1;
      scores.Planners += 1;
    }

    // wardrobeStyle - 1x weight - handle both full and short format
    const wardrobeStyle = answers.wardrobeStyle;
    if (wardrobeStyle === 'timeless' || wardrobeStyle === 'classics') {
      scores.Planners += 4;      // Boosted from 1 to 4 (Winning trait for Planners)
      scores.Philosophers += 1;
    } else if (wardrobeStyle === 'bold' || wardrobeStyle === 'trendy' || wardrobeStyle === 'statement') {
      scores.Trailblazers += 3;
      scores.Storytellers += 1;
      scores['Free Spirits'] += 1;
    }

    // Scale questions (1-5) - 1x weight
    const introvertScale = answers.introvertScale || 3;
    if (introvertScale === 1 || introvertScale === 2) {
      scores.Trailblazers += 1;
      scores.Storytellers += 1;
    } else if (introvertScale === 4 || introvertScale === 5) {
      scores.Philosophers += 2;
      scores.Planners += 2; // Equal weight for introversion
    } else if (introvertScale === 3) {
      scores['Free Spirits'] += 1;
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

  // Keep original findAll for backward compatibility
  async findAll() {
    return this.findAllFiltered();
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            country: true,
          },
        },
        roles: true,
        bookings: {
          include: {
            event: true,
          },
        },
        personalityAssessment: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from result
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      // Create profile if doesn't exist
      await this.prisma.profile.create({
        data: {
          userId,
          ...dto,
        },
      });
    } else {
      // Update existing profile
      await this.prisma.profile.update({
        where: { userId },
        data: dto,
      });
    }

    return this.findOne(userId);
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async getUserCategory(userId: string) {
    // Check if user has a COMPLETED assessment (completedAt must be set)
    const assessment = await this.prisma.personalityAssessment.findUnique({
      where: { userId },
    });

    // No assessment record or assessment not completed (auto-save creates records without completedAt)
    if (!assessment || !assessment.completedAt) {
      return {
        category: null,
        scores: null,
        description: null,
        hasAssessment: false,
      };
    }

    try {
      const categorized = await this.pairingAlgorithm.categorizeParticipant(userId);

      return {
        category: categorized.category,
        scores: categorized.scores,
        description: this.getCategoryDescription(categorized.category),
        bestPairings: this.pairingAlgorithm.getBestPairings(categorized.category),
        hasAssessment: true,
      };
    } catch (error) {
      console.error('Failed to categorize user:', error);
      return {
        category: null,
        scores: null,
        description: null,
        hasAssessment: false,
        error: 'Failed to calculate personality category',
      };
    }
  }

  private getCategoryDescription(category: PersonalityCategory): string {
    const descriptions: Record<PersonalityCategory, string> = {
      'Trailblazers': 'Adventurous and trend-setting. You love exploring new experiences and bringing fresh energy to every gathering.',
      'Storytellers': 'Engaging and expressive. You thrive in conversations, steering discussions with your natural charisma.',
      'Philosophers': 'Thoughtful and introspective. You enjoy deep conversations and meaningful connections.',
      'Planners': 'Organized and reliable. You appreciate structure and bring stability to group dynamics.',
      'Free Spirits': 'Adaptable and easy-going. You go with the flow and make everyone feel comfortable.',
    };
    return descriptions[category] || '';
  }

  async searchUsers(query: string) {
    // Search users by email or phone
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { profile: { phone: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        profile: true,
        personalityAssessment: true,
      },
      take: 10, // Limit to 10 results
    });

    // Transform results to remove password and include personality data
    return users.map(({ password, profile, personalityAssessment, ...user }) => ({
      id: user.id,
      email: user.email,
      fullName: profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile?.firstName || user.email.split('@')[0],
      phone: profile?.phone || null,
      age: profile?.age || null,
      gender: profile?.gender || null,
      city: profile?.city || null,
      personality: personalityAssessment?.answers || null,
      assessmentCompleted: profile?.assessmentCompleted || false,
    }));
  }

  async migrateLegacyPersonalityData() {
    // Get all users with personality assessments that have the old format (q1, q2, etc.)
    const users = await this.prisma.personalityAssessment.findMany({
      where: {
        answers: {
          path: ['q1'],
          not: null,
        },
      },
      include: {
        user: true,
      },
    });

    console.log(`Found ${users.length} users with legacy personality format`);

    const results = {
      total: users.length,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const assessment of users) {
      try {
        const oldAnswers = assessment.answers as any;

        // Map old format to new format based on CSV structure
        const newAnswers: any = {};

        // Column 3 (q4): dinnerVibe
        const dinnerVibeRaw = (oldAnswers.q4 || '').toLowerCase();
        if (dinnerVibeRaw.includes('steering') || dinnerVibeRaw.includes('lead')) {
          newAnswers.dinnerVibe = 'steering';
        } else if (dinnerVibeRaw.includes('sharing') || dinnerVibeRaw.includes('stories')) {
          newAnswers.dinnerVibe = 'sharing';
        } else if (dinnerVibeRaw.includes('observe') || dinnerVibeRaw.includes('listen')) {
          newAnswers.dinnerVibe = 'observing';
        } else if (dinnerVibeRaw.includes('adapt') || dinnerVibeRaw.includes('flow')) {
          newAnswers.dinnerVibe = 'adapting';
        }

        // Column 4 (q5): talkTopic
        const talkTopicRaw = (oldAnswers.q5 || '').toLowerCase();
        if (talkTopicRaw.includes('current events') || talkTopicRaw.includes('world issues')) {
          newAnswers.talkTopic = 'current_events';
        } else if (talkTopicRaw.includes('arts') || talkTopicRaw.includes('entertainment')) {
          newAnswers.talkTopic = 'arts_entertainment';
        } else if (talkTopicRaw.includes('personal growth') || talkTopicRaw.includes('philosophy')) {
          newAnswers.talkTopic = 'personal_growth';
        } else if (talkTopicRaw.includes('food') || talkTopicRaw.includes('travel')) {
          newAnswers.talkTopic = 'food_travel';
        } else if (talkTopicRaw.includes('hobbies')) {
          newAnswers.talkTopic = 'hobbies';
        }

        // Column 5 (q6): groupDynamic
        const groupDynamicRaw = (oldAnswers.q6 || '').toLowerCase();
        if (groupDynamicRaw.includes('diverse') || groupDynamicRaw.includes('different viewpoints')) {
          newAnswers.groupDynamic = 'diverse';
        } else if (groupDynamicRaw.includes('shared') || groupDynamicRaw.includes('similar')) {
          newAnswers.groupDynamic = 'similar';
        }

        // Column 6 (q7): humorType
        const humorTypeRaw = (oldAnswers.q7 || '').toLowerCase();
        if (humorTypeRaw.includes('sarcastic')) {
          newAnswers.humorType = 'sarcastic';
        } else if (humorTypeRaw.includes('playful') || humorTypeRaw.includes('lighthearted')) {
          newAnswers.humorType = 'playful';
        } else if (humorTypeRaw.includes('witty') || humorTypeRaw.includes('clever')) {
          newAnswers.humorType = 'witty';
        } else if (humorTypeRaw.includes('not') || humorTypeRaw.includes('none')) {
          newAnswers.humorType = 'not_a_fan';
        }

        // Column 7 (q8): wardrobeStyle
        const wardrobeStyleRaw = (oldAnswers.q8 || '').toLowerCase();
        if (wardrobeStyleRaw.includes('timeless') || wardrobeStyleRaw.includes('classics')) {
          newAnswers.wardrobeStyle = 'timeless';
        } else if (wardrobeStyleRaw.includes('bold') || wardrobeStyleRaw.includes('trendy')) {
          newAnswers.wardrobeStyle = 'bold';
        }

        // Columns 8-12 (q9-q13): Scale questions
        newAnswers.introvertScale = parseInt(oldAnswers.q9) || 3;
        newAnswers.aloneTimeScale = parseInt(oldAnswers.q10) || 3;
        newAnswers.familyScale = parseInt(oldAnswers.q11) || 3;
        newAnswers.spiritualityScale = parseInt(oldAnswers.q12) || 3;
        newAnswers.humorScale = parseInt(oldAnswers.q13) || 3;

        // Column 13 (q14): meetingPriority
        const meetingPriorityRaw = (oldAnswers.q14 || '').toLowerCase();
        if (meetingPriorityRaw.includes('shared values') || meetingPriorityRaw.includes('interests')) {
          newAnswers.meetingPriority = 'values';
        } else if (meetingPriorityRaw.includes('fun') || meetingPriorityRaw.includes('engaging')) {
          newAnswers.meetingPriority = 'fun';
        } else if (meetingPriorityRaw.includes('learning')) {
          newAnswers.meetingPriority = 'learning';
        } else if (meetingPriorityRaw.includes('connection')) {
          newAnswers.meetingPriority = 'connection';
        }

        // Update the assessment with new format
        await this.prisma.personalityAssessment.update({
          where: { userId: assessment.userId },
          data: { answers: newAnswers },
        });

        results.updated++;
        console.log(`✅ Updated personality data for user ${assessment.user.email}`);
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to update ${assessment.user.email}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return results;
  }
}
