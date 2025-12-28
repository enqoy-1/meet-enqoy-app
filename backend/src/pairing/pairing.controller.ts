import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { PairingAlgorithmService } from './pairing-algorithm.service';
import { GeminiPairingService } from './gemini-pairing.service';
import { RestaurantDistributionService, Restaurant } from './restaurant-distribution.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Prisma, UserRole } from '@prisma/client';

@Controller('pairing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.super_admin)
export class PairingController {
  constructor(
    private pairingService: PairingService,
    private pairingAlgorithmService: PairingAlgorithmService,
    private geminiPairingService: GeminiPairingService,
    private restaurantDistributionService: RestaurantDistributionService,
    private prisma: PrismaService,
  ) { }

  @Get('events/:eventId/guests')
  getEventGuests(@Param('eventId') eventId: string) {
    return this.pairingService.getEventGuests(eventId);
  }

  @Post('events/:eventId/import-bookings')
  async importBookingsAsGuests(@Param('eventId') eventId: string) {
    // Get all confirmed bookings for the event
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId,
        status: 'confirmed',
      },
      include: {
        user: {
          include: {
            profile: true,
            personalityAssessment: true,
          },
        },
      },
    });

    // Get existing guests to avoid duplicates
    const existingGuests = await this.pairingService.getEventGuests(eventId);
    const existingUserIds = new Set(existingGuests.map((g: any) => g.userId).filter(Boolean));
    const existingEmails = new Set(existingGuests.map((g: any) => g.email?.toLowerCase()).filter(Boolean));

    const imported = [];
    const skipped = [];

    for (const booking of bookings) {
      // Skip if already imported (check both userId and email)
      if (existingUserIds.has(booking.userId) || existingEmails.has(booking.user.email?.toLowerCase())) {
        skipped.push({
          userId: booking.userId,
          email: booking.user.email,
          reason: 'Already imported (duplicate userId or email)',
        });
        continue;
      }

      try {
        // Debug log the assessment data
        console.log(`Importing guest ${booking.user.email}:`, {
          hasProfile: !!booking.user.profile,
          hasAssessment: !!booking.user.personalityAssessment,
          assessmentAnswers: booking.user.personalityAssessment?.answers ? 'present' : 'null',
        });

        const guest = await this.pairingService.createGuest({
          eventId,
          userId: booking.userId,
          name: booking.user.profile?.firstName && booking.user.profile?.lastName
            ? `${booking.user.profile.firstName} ${booking.user.profile.lastName}`
            : booking.user.email.split('@')[0],
          email: booking.user.email,
          gender: booking.user.profile?.gender || null,
          age: booking.user.profile?.age || null,
          personality: booking.user.personalityAssessment?.answers || null,
        });
        imported.push(guest);
      } catch (error) {
        skipped.push({
          userId: booking.userId,
          email: booking.user.email,
          reason: error.message,
        });
      }
    }

    return {
      imported: imported.length,
      skipped: skipped.length,
      details: {
        imported,
        skipped,
      },
    };
  }

  // Generate random personality data for guests missing it
  @Post('events/:eventId/fill-missing-personality')
  async fillMissingPersonality(@Param('eventId') eventId: string) {
    // Get all guests for the event
    const allGuests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
    });

    // Filter out guests that have personality data
    const guests = allGuests.filter(guest =>
      !guest.personality ||
      (typeof guest.personality === 'object' && Object.keys(guest.personality).length === 0)
    );

    // Personality answer options
    const talkTopics = ['Current events and world issues', 'Arts, entertainment, and pop culture', 'Personal growth and philosophy', 'Food, travel, and experiences', 'Hobbies and niche interests'];
    const groupDynamics = ['A mix of people with shared interests and similar personalities', 'A diverse group with different viewpoints and experiences'];
    const dinnerVibes = ['steering', 'sharing', 'observing', 'adapting'];
    const humorTypes = ['sarcastic', 'playful', 'witty', 'not_a_fan'];
    const wardrobeStyles = ['timeless', 'bold'];
    const meetingPriorities = ['Shared values and interests', 'Fun and engaging conversations', 'Learning something new from others', 'Feeling a sense of connection'];
    const spendingOptions = ['500-1000', '1000-1500', '1500+'];

    const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const updated = [];
    for (const guest of guests) {
      const personality = {
        talkTopic: getRandomItem(talkTopics),
        groupDynamic: getRandomItem(groupDynamics),
        dinnerVibe: getRandomItem(dinnerVibes),
        humorType: getRandomItem(humorTypes),
        wardrobeStyle: getRandomItem(wardrobeStyles),
        introvertScale: Math.floor(Math.random() * 5) + 1,
        aloneTimeScale: Math.floor(Math.random() * 5) + 1,
        familyScale: Math.floor(Math.random() * 5) + 1,
        spiritualityScale: Math.floor(Math.random() * 5) + 1,
        humorScale: Math.floor(Math.random() * 5) + 1,
        meetingPriority: getRandomItem(meetingPriorities),
        spending: getRandomItem(spendingOptions),
        gender: guest.gender || 'prefer_not_to_say',
      };

      await this.prisma.pairingGuest.update({
        where: { id: guest.id },
        data: { personality },
      });

      updated.push(guest.id);
    }

    return {
      message: `Generated personality data for ${updated.length} guest(s)`,
      count: updated.length,
    };
  }

  @Get('events/:eventId/pairs')
  getEventPairs(@Param('eventId') eventId: string) {
    return this.pairingService.getEventPairs(eventId);
  }

  @Get('events/:eventId/restaurants')
  getEventRestaurants(@Param('eventId') eventId: string) {
    return this.pairingService.getEventRestaurants(eventId);
  }

  @Get('events/:eventId/constraints')
  getConstraints(@Param('eventId') eventId: string) {
    return this.pairingService.getConstraints(eventId);
  }

  @Post('guests')
  createGuest(@Body() data: any) {
    return this.pairingService.createGuest(data);
  }

  @Post('pairs')
  createPair(@Body() data: { guest1Id: string; guest2Id: string; score?: number }) {
    return this.pairingService.createPair(data.guest1Id, data.guest2Id, data.score);
  }

  @Post('assignments')
  createAssignment(
    @Body() data: { guestId: string; tableId: string | null; restaurantId?: string; seatNumber?: number; groupName?: string },
  ) {
    return this.pairingService.createAssignment(
      data.guestId,
      data.tableId,
      data.restaurantId || null,
      data.seatNumber,
      data.groupName,
    );
  }

  @Post('restaurants')
  createRestaurant(@Body() data: any) {
    return this.pairingService.createRestaurant(data);
  }

  @Post('tables')
  createTable(@Body() data: any) {
    return this.pairingService.createTable(data);
  }

  @Delete('tables/:tableId')
  deleteTable(@Param('tableId') tableId: string) {
    return this.pairingService.deleteTable(tableId);
  }

  // Constraints
  @Post('constraints')
  createConstraint(@Body() data: { guest1Id: string; guest2Id: string; type: 'must_pair' | 'avoid_pair'; reason?: string }) {
    return this.pairingService.createConstraint(data);
  }

  @Delete('constraints/:id')
  deleteConstraint(@Param('id') id: string) {
    return this.pairingService.deleteConstraint(id);
  }

  // Assignment management
  @Delete('assignments/:id')
  deleteAssignment(@Param('id') id: string) {
    return this.pairingService.deleteAssignment(id);
  }

  @Post('assignments/:id')
  updateAssignment(@Param('id') id: string, @Body() data: { restaurantId?: string; tableId?: string | null; seatNumber?: number | null; status?: string }) {
    return this.pairingService.updateAssignment(id, data);
  }

  // Guest management
  @Delete('events/:eventId/guests')
  async deleteAllGuests(@Param('eventId') eventId: string) {
    const result = await this.prisma.pairingGuest.deleteMany({
      where: { eventId },
    });
    return { deleted: result.count };
  }

  @Post('events/:eventId/link-guests-to-users')
  async linkGuestsToUsers(@Param('eventId') eventId: string) {
    const guests = await this.prisma.pairingGuest.findMany({
      where: { eventId, userId: null },
    });

    let linked = 0;
    let skipped = 0;

    for (const guest of guests) {
      if (!guest.email) {
        skipped++;
        continue;
      }

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: guest.email.toLowerCase() },
      });

      if (user) {
        await this.prisma.pairingGuest.update({
          where: { id: guest.id },
          data: { userId: user.id },
        });
        linked++;
      } else {
        skipped++;
      }
    }

    return { linked, skipped, total: guests.length };
  }

  @Post('events/:eventId/create-users-from-guests')
  async createUsersFromGuests(@Param('eventId') eventId: string) {
    const guests = await this.prisma.pairingGuest.findMany({
      where: { eventId, userId: null },
    });

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const guest of guests) {
      if (!guest.email) {
        skipped++;
        errors.push({ guest: guest.name, reason: 'No email' });
        continue;
      }

      try {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email: guest.email.toLowerCase() },
        });

        if (existingUser) {
          // Link to existing user
          await this.prisma.pairingGuest.update({
            where: { id: guest.id },
            data: { userId: existingUser.id },
          });
          skipped++;
          continue;
        }

        // Parse name into first/last
        const nameParts = guest.name.split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Build user data
        const userData: any = {
          email: guest.email.toLowerCase(),
          password: 'LEGACY_USER_NO_PASSWORD', // They'll need to reset
          isEmailVerified: false,
          profile: {
            create: {
              firstName,
              lastName,
              gender: guest.gender,
              age: guest.age,
            },
          },
        };

        // Only add personality assessment if it exists
        if (guest.personality) {
          userData.personalityAssessment = {
            create: {
              answers: guest.personality,
              completedAt: new Date(),
            },
          };
        }

        // Create new user with profile and assessment
        const newUser = await this.prisma.user.create({
          data: userData,
        });

        // Link guest to new user
        await this.prisma.pairingGuest.update({
          where: { id: guest.id },
          data: { userId: newUser.id },
        });

        created++;
      } catch (error) {
        skipped++;
        errors.push({ guest: guest.name, reason: error.message });
      }
    }

    return { created, skipped, total: guests.length, errors };
  }

  // Create a single user from guest data (for migration UI)
  @Post('users/create-from-legacy')
  async createUserFromLegacyGuest(@Body() body: { guestId: string; userData: any }) {
    const { guestId, userData } = body;

    // Get the guest
    const guest = await this.prisma.pairingGuest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new Error('Guest not found');
    }

    if (!userData.email) {
      throw new Error('Email is required');
    }

    // Check if user already exists with this email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email.toLowerCase() },
    });

    if (existingUser) {
      // Link guest to existing user
      await this.prisma.pairingGuest.update({
        where: { id: guestId },
        data: { userId: existingUser.id },
      });
      return {
        status: 'linked',
        message: 'Guest linked to existing user',
        userId: existingUser.id
      };
    }

    // Hash the password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create new user with profile and optional personality assessment
    const newUser = await this.prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        profile: userData.profile,
        personalityAssessment: userData.personalityAssessment,
      },
      include: {
        profile: true,
        personalityAssessment: true,
      },
    });

    // Link guest to new user
    await this.prisma.pairingGuest.update({
      where: { id: guestId },
      data: { userId: newUser.id },
    });

    return {
      status: 'created',
      message: 'User account created successfully',
      userId: newUser.id
    };
  }

  // Restaurant management
  @Post('restaurants/:id')
  updateRestaurant(@Param('id') id: string, @Body() data: { name?: string; address?: string; capacity?: number; contactInfo?: string }) {
    return this.pairingService.updateRestaurant(id, data);
  }

  // Audit log
  @Post('audit-log')
  createAuditLog(@Body() data: { action: string; entityType: string; entityId: string; details?: any }) {
    return this.pairingService.logAction(data.action, data.entityType, data.entityId, data.details);
  }

  // Get event assignments
  @Get('events/:eventId/assignments')
  getEventAssignments(@Param('eventId') eventId: string) {
    return this.pairingService.getEventAssignments(eventId);
  }

  // Algorithm endpoints
  @Get('events/:eventId/categorize/:userId')
  async categorizeParticipant(@Param('eventId') eventId: string, @Param('userId') userId: string) {
    return this.pairingAlgorithmService.categorizeParticipant(userId);
  }

  @Post('events/:eventId/generate-groups')
  async generateGroups(
    @Param('eventId') eventId: string,
    @Body() body: { groupSize?: number; useAI?: boolean; allowConstraintRelaxation?: boolean },
  ) {
    console.log('🔍 Generate Groups Request Body:', body);
    const groupSize = body.groupSize || 6;
    console.log('🎯 Group Size (after default):', groupSize, 'Type:', typeof groupSize);
    const useAI = body.useAI !== false; // Default to true
    const allowConstraintRelaxation = body.allowConstraintRelaxation !== false; // Default to true

    if (useAI) {
      // Use Gemini-enhanced group generation with constraint relaxation
      return this.geminiPairingService.generateOptimalGroups(eventId, groupSize, {
        allowConstraintRelaxation,
      });
    } else {
      // Use base algorithm only (strict mode, no relaxation)
      return this.pairingAlgorithmService.generateGroups(eventId, groupSize);
    }
  }

  @Get('events/:eventId/categorize-all')
  async categorizeAllParticipants(@Param('eventId') eventId: string) {
    // Get all confirmed bookings for the event
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId,
        status: 'confirmed',
      },
      include: {
        user: {
          include: {
            profile: true,
            personalityAssessment: true,
          },
        },
      },
    });

    const categorizations = [];

    for (const booking of bookings) {
      if (booking.user.personalityAssessment) {
        try {
          const categorized = await this.pairingAlgorithmService.categorizeParticipant(booking.userId);
          categorizations.push({
            userId: booking.userId,
            userEmail: booking.user.email,
            userName: booking.user.profile?.firstName + ' ' + booking.user.profile?.lastName,
            ...categorized,
          });
        } catch (error) {
          categorizations.push({
            userId: booking.userId,
            userEmail: booking.user.email,
            error: error.message,
          });
        }
      }
    }

    return categorizations;
  }

  // Gemini-enhanced endpoints
  @Get('events/:eventId/categorize/:userId/ai')
  async categorizeParticipantWithAI(@Param('eventId') eventId: string, @Param('userId') userId: string) {
    return this.geminiPairingService.enhanceCategorization(userId);
  }

  @Post('events/:eventId/analyze-group')
  async analyzeGroup(@Param('eventId') eventId: string, @Body() body: { participantIds: string[] }) {
    // Get participants
    const participants = await Promise.all(
      body.participantIds.map((id) => this.pairingAlgorithmService.categorizeParticipant(id)),
    );

    // Create a group object
    const group = this.pairingAlgorithmService.createGroup(participants);

    // Analyze with Gemini
    return this.geminiPairingService.analyzeGroupCompatibility(group);
  }

  @Get('events/:eventId/suggest-pairings/:userId')
  async suggestPairings(@Param('eventId') eventId: string, @Param('userId') userId: string) {
    // Get all other participants for the event
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId,
        status: 'confirmed',
        userId: { not: userId },
      },
      include: {
        user: {
          include: {
            personalityAssessment: true,
          },
        },
      },
    });

    const otherParticipants = await Promise.all(
      bookings
        .filter((b) => b.user.personalityAssessment)
        .map((b) => this.pairingAlgorithmService.categorizeParticipant(b.userId)),
    );

    return this.geminiPairingService.suggestBestPairings(eventId, userId, otherParticipants);
  }

  // ============================================
  // COMPREHENSIVE WORKFLOW ENDPOINTS
  // ============================================

  /**
   * Complete event pairing: Import bookings, generate groups, assign to restaurants
   * This is the main endpoint that does everything automatically
   */
  @Post('events/:eventId/complete-pairing')
  async completeEventPairing(
    @Param('eventId') eventId: string,
    @Body() body: {
      restaurants: Restaurant[];
      groupSize?: 5 | 6;
      useAI?: boolean;
      clearExisting?: boolean;
    },
  ) {
    const { restaurants, groupSize = 6, useAI = true, clearExisting = false } = body;

    if (!restaurants || restaurants.length === 0) {
      throw new Error('At least one restaurant must be provided');
    }

    // Step 0: Clear existing assignments if requested
    if (clearExisting) {
      await this.restaurantDistributionService.clearEventAssignments(eventId);
    }

    // Step 1: Import bookings as guests (if not already imported)
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId,
        status: 'confirmed',
      },
      include: {
        user: {
          include: {
            profile: true,
            personalityAssessment: true,
          },
        },
      },
    });

    const existingGuests = await this.pairingService.getEventGuests(eventId);
    const existingUserIds = new Set(existingGuests.map((g: any) => g.userId));
    let importedCount = 0;

    for (const booking of bookings) {
      if (!existingUserIds.has(booking.userId)) {
        await this.pairingService.createGuest({
          eventId,
          userId: booking.userId,
          name:
            booking.user.profile?.firstName && booking.user.profile?.lastName
              ? `${booking.user.profile.firstName} ${booking.user.profile.lastName}`
              : booking.user.email.split('@')[0],
          email: booking.user.email,
          gender: booking.user.profile?.gender || null,
          age: booking.user.profile?.age || null,
          personality: booking.user.personalityAssessment?.answers || null,
        });
        importedCount++;
      }
    }

    // Step 2: Generate optimal groups
    let groups;
    if (useAI) {
      groups = await this.geminiPairingService.generateOptimalGroups(eventId, groupSize);
    } else {
      groups = await this.pairingAlgorithmService.generateGroups(eventId, groupSize);
    }

    if (groups.length === 0) {
      throw new Error('Could not generate any groups. Make sure there are enough confirmed bookings with completed assessments.');
    }

    // Step 3: Distribute groups to restaurants and create assignments
    const distribution = await this.restaurantDistributionService.distributeGroupsToRestaurants(
      eventId,
      groups,
      restaurants,
    );

    return {
      success: true,
      imported: importedCount,
      totalGuests: bookings.length,
      groupsGenerated: groups.length,
      distribution,
      message: `Successfully paired ${distribution.summary.totalGuests} guests into ${groups.length} groups across ${distribution.summary.totalRestaurants} restaurants`,
    };
  }

  /**
   * Distribute already-generated groups to restaurants
   */
  @Post('events/:eventId/distribute-to-restaurants')
  async distributeToRestaurants(
    @Param('eventId') eventId: string,
    @Body() body: {
      restaurants: Restaurant[];
      groupSize?: 5 | 6;
      useAI?: boolean;
    },
  ) {
    const { restaurants, groupSize = 6, useAI = true } = body;

    // Generate groups first
    let groups;
    if (useAI) {
      groups = await this.geminiPairingService.generateOptimalGroups(eventId, groupSize);
    } else {
      groups = await this.pairingAlgorithmService.generateGroups(eventId, groupSize);
    }

    // Distribute to restaurants
    const distribution = await this.restaurantDistributionService.distributeGroupsToRestaurants(
      eventId,
      groups,
      restaurants,
    );

    return {
      success: true,
      groupsGenerated: groups.length,
      distribution,
    };
  }

  /**
   * Clear all restaurant assignments for an event
   */
  @Delete('events/:eventId/clear-assignments')
  async clearAssignments(@Param('eventId') eventId: string) {
    await this.restaurantDistributionService.clearEventAssignments(eventId);
    return {
      success: true,
      message: 'All restaurant assignments cleared for this event',
    };
  }
}

// ============================================
// USER-FACING PAIRING ENDPOINTS
// These endpoints are accessible to all authenticated users
// ============================================
@Controller('user-pairing')
@UseGuards(JwtAuthGuard)
export class UserPairingController {
  constructor(private pairingService: PairingService) { }

  /**
   * Get the current user's restaurant assignment for a specific event
   */
  @Get('events/:eventId/my-assignment')
  async getMyAssignment(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    const assignment = await this.pairingService.getUserAssignment(user.id, eventId);

    if (!assignment) {
      return {
        hasAssignment: false,
        message: 'No restaurant assignment found for this event',
      };
    }

    return {
      hasAssignment: true,
      ...assignment,
    };
  }
}

