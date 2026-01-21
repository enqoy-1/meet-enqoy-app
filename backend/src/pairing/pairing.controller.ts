import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { PairingAlgorithmService } from './pairing-algorithm.service';
import { GeminiPairingService } from './gemini-pairing.service';
import { RestaurantDistributionService, Restaurant } from './restaurant-distribution.service';
import { PrismaService } from '../prisma/prisma.service';
import { IcebreakersService } from '../icebreakers/icebreakers.service';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Prisma, UserRole } from '@prisma/client';
import { format } from 'date-fns';

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
    private icebreakersService: IcebreakersService,
    private emailService: EmailService,
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
  async createAssignment(
    @Body() data: { guestId: string; tableId: string | null; restaurantId?: string; seatNumber?: number; groupName?: string },
  ) {
    // Check for existing assignment to detect changes
    const existingAssignment = await this.prisma.pairingAssignment.findUnique({
      where: { guestId: data.guestId },
      include: {
        guest: { include: { event: true } },
        restaurant: true,
      },
    });

    const result = await this.pairingService.createAssignment(
      data.guestId,
      data.tableId,
      data.restaurantId || null,
      data.seatNumber,
      data.groupName,
    );

    // Check for notifications
    if (
      existingAssignment &&
      existingAssignment.guest.event.pairingPublished &&
      existingAssignment.guest.email &&
      data.restaurantId &&
      existingAssignment.restaurantId &&
      data.restaurantId !== existingAssignment.restaurantId
    ) {
      try {
        const newRestaurant = await this.prisma.pairingRestaurant.findUnique({
          where: { id: data.restaurantId },
        });

        if (newRestaurant) {
          const eventDate = format(new Date(existingAssignment.guest.event.startTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a');

          await this.emailService.sendRestaurantAssignmentUpdate({
            to: existingAssignment.guest.email,
            userName: existingAssignment.guest.name,
            eventTitle: existingAssignment.guest.event.title,
            eventDate: eventDate,
            oldRestaurantName: existingAssignment.restaurant?.name || 'Unknown',
            newRestaurantName: newRestaurant.name,
            newRestaurantAddress: newRestaurant.address || 'Address included in map',
            groupName: result.groupName || undefined,
          });
          console.log(`📧 Sent update email to ${existingAssignment.guest.email}`);

          // Reset notification flag so user sees it in-app
          await this.prisma.pairingGuest.update({
            where: { id: existingAssignment.guest.id },
            data: { pairingNotificationSent: false }
          });
        }
      } catch (error) {
        console.error('Failed to send update email:', error);
      }
    }

    return result;
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
  async updateAssignment(@Param('id') id: string, @Body() data: { restaurantId?: string; tableId?: string | null; seatNumber?: number | null; status?: string }) {
    // Get current assignment to check for changes
    const currentAssignment = await this.prisma.pairingAssignment.findUnique({
      where: { id },
      include: {
        guest: { include: { event: true } },
        restaurant: true,
      },
    });

    // Perform update
    const updated = await this.pairingService.updateAssignment(id, data);

    // Check if we need to send a notification
    // 1. Restaurant changed
    // 2. Event is published
    // 3. User has email
    if (
      currentAssignment &&
      data.restaurantId &&
      currentAssignment.restaurantId &&
      data.restaurantId !== currentAssignment.restaurantId &&
      currentAssignment.guest.event.pairingPublished &&
      currentAssignment.guest.email
    ) {
      try {
        const newRestaurant = await this.prisma.pairingRestaurant.findUnique({
          where: { id: data.restaurantId },
        });

        if (newRestaurant) {
          const eventDate = format(new Date(currentAssignment.guest.event.startTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a');

          await this.emailService.sendRestaurantAssignmentUpdate({
            to: currentAssignment.guest.email,
            userName: currentAssignment.guest.name,
            eventTitle: currentAssignment.guest.event.title,
            eventDate: eventDate,
            oldRestaurantName: currentAssignment.restaurant?.name || 'Unknown',
            newRestaurantName: newRestaurant.name,
            newRestaurantAddress: newRestaurant.address || 'Address included in map',
            groupName: updated.groupName || undefined,
          });
          console.log(`📧 Sent update email to ${currentAssignment.guest.email}`);

          // Reset notification flag so user sees it in-app
          await this.prisma.pairingGuest.update({
            where: { id: currentAssignment.guest.id },
            data: { pairingNotificationSent: false }
          });
        }
      } catch (error) {
        console.error('Failed to send update email:', error);
      }
    }

    return updated;
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

        if (guest.personality) {
          userData.personalityAssessment = {
            create: {
              answers: guest.personality,
              completedAt: new Date(),
              isCompleted: true,
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

    let groups;
    if (useAI) {
      // Use Gemini-enhanced group generation with constraint relaxation
      groups = await this.geminiPairingService.generateOptimalGroups(eventId, groupSize, {
        allowConstraintRelaxation,
      });

      // Save AI-generated conversation starters to icebreakers database
      if (groups && groups.length > 0) {
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const group of groups) {
          if (group.conversationStarters && group.conversationStarters.length > 0) {
            const result = await this.icebreakersService.createAIGeneratedQuestions(
              group.conversationStarters,
              eventId,
              group.name,
            );
            totalCreated += result.created;
            totalSkipped += result.skipped;
          }
        }

        console.log(`💬 Saved ${totalCreated} AI-generated conversation starters (${totalSkipped} duplicates skipped)`);
      }
    } else {
      // Use base algorithm only (strict mode, no relaxation)
      groups = await this.pairingAlgorithmService.generateGroups(eventId, groupSize);
    }

    return groups;
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

      // Save AI-generated conversation starters to icebreakers database
      if (groups && groups.length > 0) {
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const group of groups) {
          if (group.conversationStarters && group.conversationStarters.length > 0) {
            const result = await this.icebreakersService.createAIGeneratedQuestions(
              group.conversationStarters,
              eventId,
              group.name,
            );
            totalCreated += result.created;
            totalSkipped += result.skipped;
          }
        }

        console.log(`💬 Saved ${totalCreated} AI-generated conversation starters (${totalSkipped} duplicates skipped)`);
      }
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

      // Save AI-generated conversation starters to icebreakers database
      if (groups && groups.length > 0) {
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const group of groups) {
          if (group.conversationStarters && group.conversationStarters.length > 0) {
            const result = await this.icebreakersService.createAIGeneratedQuestions(
              group.conversationStarters,
              eventId,
              group.name,
            );
            totalCreated += result.created;
            totalSkipped += result.skipped;
          }
        }

        console.log(`💬 Saved ${totalCreated} AI-generated conversation starters (${totalSkipped} duplicates skipped)`);
      }
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

  /**
   * Publish pairing for an event (marks event as published and sends notifications)
   */
  @Post('events/:eventId/publish-pairing')
  async publishPairing(@Param('eventId') eventId: string) {
    // Get event details
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const wasAlreadyPublished = event.pairingPublished;

    // Mark event as published
    await this.prisma.event.update({
      where: { id: eventId },
      data: { pairingPublished: true },
    });

    // Get all assignments with guest and restaurant info
    const assignments = await this.prisma.pairingAssignment.findMany({
      where: {
        guest: {
          eventId: eventId,
        },
      },
      include: {
        guest: true,
        restaurant: true,
      },
    });

    // Send emails to all guests with assignments (in parallel, non-blocking)
    const eventDate = format(new Date(event.startTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
    const emailsToSend = assignments.filter(a => a.guest.email && a.restaurant).length;

    // Reset notification flags for all assigned guests so they see the in-app notification
    const assignedGuestIds = assignments.map(a => a.guestId);
    if (assignedGuestIds.length > 0) {
      await this.prisma.pairingGuest.updateMany({
        where: {
          id: { in: assignedGuestIds },
        },
        data: { pairingNotificationSent: false },
      });
    }

    // Fire and forget - send emails in background
    Promise.all(
      assignments
        .filter(a => a.guest.email && a.restaurant)
        .map(assignment =>
          this.emailService.sendRestaurantAssignment({
            to: assignment.guest.email,
            userName: assignment.guest.name || 'Guest',
            eventTitle: event.title,
            eventDate: eventDate,
            restaurantName: assignment.restaurant.name,
            restaurantAddress: assignment.restaurant.address || 'Address TBD',
            googleMapsUrl: assignment.restaurant.googleMapsUrl || undefined,
            groupName: assignment.groupName || undefined,
          }).catch(error => console.error(`Failed to send email to ${assignment.guest.email}:`, error))
        )
    ).then(() => console.log(`✅ All ${emailsToSend} pairing emails sent`));

    return {
      success: true,
      message: wasAlreadyPublished
        ? `Pairing updated. ${emailsToSend} notification${emailsToSend !== 1 ? 's' : ''} being sent.`
        : `Pairing published successfully. ${emailsToSend} notification${emailsToSend !== 1 ? 's' : ''} being sent.`,
      emailsSent: emailsToSend,
    };
  }

  /**
   * Update pairing for an event (sends update notifications to affected guests)
   */
  @Post('events/:eventId/update-pairing')
  async updatePairing(
    @Param('eventId') eventId: string,
    @Body() body: { changedAssignments?: { guestId: string; oldRestaurantId: string; newRestaurantId: string }[] },
  ) {
    // Get event details
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.pairingPublished) {
      // If not published yet, just publish
      return this.publishPairing(eventId);
    }

    // Get changed assignments info
    const changedAssignments = body.changedAssignments || [];
    const eventDate = format(new Date(event.startTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a');

    if (changedAssignments.length === 0) {
      return {
        success: true,
        message: 'Pairing updated. No notification emails needed.',
        emailsSent: 0,
      };
    }

    // Fetch all data in parallel for speed
    const [guests, restaurants, assignments] = await Promise.all([
      this.prisma.pairingGuest.findMany({
        where: { id: { in: changedAssignments.map(c => c.guestId) } },
      }),
      this.prisma.pairingRestaurant.findMany({
        where: {
          id: {
            in: [
              ...changedAssignments.map(c => c.oldRestaurantId),
              ...changedAssignments.map(c => c.newRestaurantId),
            ],
          },
        },
      }),
      this.prisma.pairingAssignment.findMany({
        where: { guestId: { in: changedAssignments.map(c => c.guestId) } },
      }),
    ]);

    // Create lookup maps
    const guestMap = new Map(guests.map(g => [g.id, g]));
    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));
    const assignmentMap = new Map(assignments.map(a => [a.guestId, a]));

    // Build email list
    const emailsToSend = changedAssignments
      .map(change => {
        const guest = guestMap.get(change.guestId);
        const oldRestaurant = restaurantMap.get(change.oldRestaurantId);
        const newRestaurant = restaurantMap.get(change.newRestaurantId);
        const assignment = assignmentMap.get(change.guestId);

        if (guest?.email && oldRestaurant && newRestaurant) {
          return {
            to: guest.email,
            userName: guest.name || 'Guest',
            eventTitle: event.title,
            eventDate: eventDate,
            oldRestaurantName: oldRestaurant.name,
            newRestaurantName: newRestaurant.name,
            newRestaurantAddress: newRestaurant.address || 'Address TBD',
            newGoogleMapsUrl: newRestaurant.googleMapsUrl || undefined,
            groupName: assignment?.groupName || undefined,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Reset notification flags for affected guests so they see the in-app notification
    await this.prisma.pairingGuest.updateMany({
      where: {
        id: { in: changedAssignments.map(c => c.guestId) },
      },
      data: { pairingNotificationSent: false },
    });

    // Fire and forget - send emails in background
    Promise.all(
      emailsToSend.map(emailData =>
        this.emailService.sendRestaurantAssignmentUpdate(emailData)
          .catch(error => console.error(`Failed to send update email to ${emailData.to}:`, error))
      )
    ).then(() => console.log(`✅ All ${emailsToSend.length} update emails sent`));

    return {
      success: true,
      message: `Pairing updated. ${emailsToSend.length} update notification${emailsToSend.length !== 1 ? 's' : ''} being sent.`,
      emailsSent: emailsToSend.length,
    };
  }

  /**
   * Unpublish pairing for an event
   */
  @Post('events/:eventId/unpublish-pairing')
  async unpublishPairing(@Param('eventId') eventId: string) {
    await this.prisma.event.update({
      where: { id: eventId },
      data: { pairingPublished: false },
    });

    return {
      success: true,
      message: 'Pairing unpublished successfully.',
    };
  }

  /**
   * Get users who haven't booked this event (for export)
   */
  @Get('events/:eventId/non-attendees')
  async getNonAttendees(@Param('eventId') eventId: string) {
    // Get all users who haven't booked this event
    const bookings = await this.prisma.booking.findMany({
      where: { eventId, status: 'confirmed' },
      select: { userId: true },
    });

    const bookedUserIds = new Set(bookings.map(b => b.userId));

    // Get all users excluding those who booked
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(bookedUserIds) },
      },
      include: {
        profile: true,
        personalityAssessment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include useful information
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
      assessmentCompleted: profile?.assessmentCompleted || false,
      createdAt: user.createdAt,
    }));
  }

  /**
   * Check if pairing is published for an event
   */
  @Get('events/:eventId/pairing-status')
  async getPairingStatus(@Param('eventId') eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { pairingPublished: true },
    });

    return {
      published: event?.pairingPublished || false,
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
  constructor(
    private pairingService: PairingService,
    private prisma: PrismaService,
  ) { }

  /**
   * Get the current user's restaurant assignment for a specific event
   */
  @Get('events/:eventId/my-assignment')
  async getMyAssignment(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    const assignment = await this.pairingService.getUserAssignment(user.id, eventId);

    // Mark notification as seen when user views their assignment
    if (assignment) {
      await this.prisma.pairingGuest.updateMany({
        where: {
          eventId,
          userId: user.id,
        },
        data: {
          pairingNotificationSent: true,
        },
      });
    }

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

  /**
   * Check if user has any unseen pairing notifications
   */
  @Get('has-pairing-updates')
  async hasPairingUpdates(@CurrentUser() user: any) {
    console.log(`🔔 Checking pairing updates for user: ${user.id} (${user.email})`);

    // Find all upcoming events where user has a booking and pairing is published
    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        userId: user.id,
        status: 'confirmed',
        event: {
          startTime: {
            gte: new Date(),
          },
          pairingPublished: true, // Only check events where pairing is published
        },
      },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            pairingPublished: true,
          },
        },
      },
    });

    console.log(`📋 Found ${upcomingBookings.length} upcoming bookings with published pairings`);

    const eventIds = upcomingBookings.map((b) => b.event.id);

    if (eventIds.length === 0) {
      return {
        hasPairingUpdates: false,
        eventsWithUpdates: [],
      };
    }

    // Check if any of these events have unseen pairing assignments
    const unseenPairings = await this.prisma.pairingGuest.findMany({
      where: {
        userId: user.id,
        eventId: { in: eventIds },
        pairingNotificationSent: false,
        assignments: {
          some: {},
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
          },
        },
        assignments: {
          select: {
            id: true,
            restaurantId: true,
          },
        },
      },
    });

    console.log(`📬 Found ${unseenPairings.length} unseen pairing notifications for user ${user.email}`);
    if (unseenPairings.length > 0) {
      unseenPairings.forEach(p => {
        console.log(`  - Event: ${p.event.title}, Assignments: ${p.assignments.length}, NotificationSent: ${p.pairingNotificationSent}`);
      });
    }

    return {
      hasPairingUpdates: unseenPairings.length > 0,
      eventsWithUpdates: unseenPairings.map((p) => ({
        eventId: p.event.id,
        eventTitle: p.event.title,
        eventStartTime: p.event.startTime,
      })),
    };
  }

  /**
   * Mark pairing notification as seen for a specific event
   */
  @Post('events/:eventId/mark-notification-seen')
  async markNotificationSeen(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    await this.prisma.pairingGuest.updateMany({
      where: {
        eventId,
        userId: user.id,
      },
      data: {
        pairingNotificationSent: true,
      },
    });

    return {
      success: true,
      message: 'Notification marked as seen',
    };
  }
}

