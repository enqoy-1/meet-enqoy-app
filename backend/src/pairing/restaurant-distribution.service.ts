import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Group } from './pairing-algorithm.service';

export interface Restaurant {
  id?: string;
  name: string;
  address?: string;
  capacity: number;
  contactInfo?: string;
}

export interface DistributionResult {
  restaurants: Array<{
    restaurant: Restaurant;
    tables: Array<{
      id: string;
      tableNumber: number;
      capacity: number;
      assignments: Array<{
        guestId: string;
        guestName: string;
        seatNumber: number;
      }>;
    }>;
    totalGuests: number;
  }>;
  summary: {
    totalRestaurants: number;
    totalTables: number;
    totalGuests: number;
    unassignedGuests: number;
  };
}

@Injectable()
export class RestaurantDistributionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Distribute groups across restaurants and create table assignments
   */
  async distributeGroupsToRestaurants(
    eventId: string,
    groups: Group[],
    restaurants: Restaurant[],
  ): Promise<DistributionResult> {
    if (groups.length === 0) {
      throw new Error('No groups to distribute');
    }

    if (restaurants.length === 0) {
      throw new Error('No restaurants provided');
    }

    // Calculate total capacity needed
    const totalGuests = groups.reduce((sum, g) => sum + g.participants.length, 0);
    const totalCapacity = restaurants.reduce((sum, r) => sum + r.capacity, 0);

    if (totalCapacity < totalGuests) {
      throw new Error(
        `Insufficient restaurant capacity. Need ${totalGuests} seats, but only ${totalCapacity} available.`,
      );
    }

    // Create or get restaurants in database
    const dbRestaurants = await Promise.all(
      restaurants.map(async (r) => {
        if (r.id) {
          // Use existing restaurant
          return this.prisma.pairingRestaurant.findUnique({ where: { id: r.id } });
        } else {
          // Create new restaurant
          return this.prisma.pairingRestaurant.create({
            data: {
              eventId,
              name: r.name,
              address: r.address,
              capacity: r.capacity,
              contactInfo: r.contactInfo,
            },
          });
        }
      }),
    );

    const result: DistributionResult = {
      restaurants: [],
      summary: {
        totalRestaurants: restaurants.length,
        totalTables: 0,
        totalGuests: 0,
        unassignedGuests: 0,
      },
    };

    // Distribute groups across restaurants using round-robin approach
    let restaurantIndex = 0;
    const restaurantAllocations = dbRestaurants.map((r) => ({
      restaurant: r!,
      groups: [] as Group[],
      currentCapacity: 0,
    }));

    // Sort groups by size (larger groups first) for better distribution
    const sortedGroups = [...groups].sort(
      (a, b) => b.participants.length - a.participants.length,
    );

    for (const group of sortedGroups) {
      // Find restaurant with most available capacity
      let bestRestaurantIdx = 0;
      let maxAvailableCapacity = 0;

      for (let i = 0; i < restaurantAllocations.length; i++) {
        const allocation = restaurantAllocations[i];
        const available = allocation.restaurant.capacity - allocation.currentCapacity;
        if (available >= group.participants.length && available > maxAvailableCapacity) {
          maxAvailableCapacity = available;
          bestRestaurantIdx = i;
        }
      }

      // Allocate group to best restaurant
      const allocation = restaurantAllocations[bestRestaurantIdx];
      allocation.groups.push(group);
      allocation.currentCapacity += group.participants.length;
    }

    // Reset pairing notification flags for all guests in this event
    // This will trigger the notification banner on user dashboards
    await this.prisma.pairingGuest.updateMany({
      where: { eventId },
      data: { pairingNotificationSent: false },
    });

    // Create tables and assignments for each restaurant
    for (const allocation of restaurantAllocations) {
      const restaurantResult = {
        restaurant: {
          id: allocation.restaurant.id,
          name: allocation.restaurant.name,
          address: allocation.restaurant.address || undefined,
          capacity: allocation.restaurant.capacity,
          contactInfo: allocation.restaurant.contactInfo || undefined,
        },
        tables: [] as any[],
        totalGuests: 0,
      };

      let tableNumber = 1;

      for (const group of allocation.groups) {
        // Create a table for this group
        const table = await this.prisma.pairingTable.create({
          data: {
            restaurantId: allocation.restaurant.id,
            tableNumber,
            capacity: group.participants.length,
          },
        });

        const tableResult = {
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          assignments: [] as any[],
        };

        // Assign each participant to a seat at this table
        let seatNumber = 1;
        for (const participant of group.participants) {
          // Find the guest in the database
          const guest = await this.prisma.pairingGuest.findFirst({
            where: {
              eventId,
              userId: participant.userId,
            },
          });

          if (guest) {
            // Create assignment
            await this.prisma.pairingAssignment.create({
              data: {
                guestId: guest.id,
                tableId: table.id,
                seatNumber,
                status: 'confirmed',
              },
            });

            tableResult.assignments.push({
              guestId: guest.id,
              guestName: guest.name,
              seatNumber,
            });

            seatNumber++;
            restaurantResult.totalGuests++;
            result.summary.totalGuests++;
          }
        }

        restaurantResult.tables.push(tableResult);
        result.summary.totalTables++;
        tableNumber++;
      }

      result.restaurants.push(restaurantResult);
    }

    return result;
  }

  /**
   * Complete workflow: Import bookings, generate groups, and assign to restaurants
   */
  async completeEventPairing(
    eventId: string,
    restaurants: Restaurant[],
    options: {
      groupSize?: 5 | 6;
      useAI?: boolean;
    } = {},
  ): Promise<{
    imported: number;
    groups: Group[];
    distribution: DistributionResult;
  }> {
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

    const existingGuests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
    });

    const existingUserIds = new Set(existingGuests.map((g) => g.userId));
    let importedCount = 0;

    for (const booking of bookings) {
      if (!existingUserIds.has(booking.userId)) {
        await this.prisma.pairingGuest.create({
          data: {
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
          },
        });
        importedCount++;
      }
    }

    // Step 2: Generate groups (this will be injected from the algorithm service)
    // For now, return empty groups - this will be filled by the controller
    const groups: Group[] = [];

    // Step 3: Distribute groups to restaurants
    const distribution = await this.distributeGroupsToRestaurants(
      eventId,
      groups,
      restaurants,
    );

    return {
      imported: importedCount,
      groups,
      distribution,
    };
  }

  /**
   * Clear all restaurant assignments for an event
   */
  async clearEventAssignments(eventId: string): Promise<void> {
    // Get all guests for this event
    const guests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
      select: { id: true },
    });
    const guestIds = guests.map(g => g.id);

    // Delete ALL assignments for guests in this event (including those not in tables)
    if (guestIds.length > 0) {
      await this.prisma.pairingAssignment.deleteMany({
        where: {
          guestId: { in: guestIds },
        },
      });
    }

    // Get all restaurants for this event
    const restaurants = await this.prisma.pairingRestaurant.findMany({
      where: { eventId },
      select: { id: true },
    });

    // Delete all tables
    if (restaurants.length > 0) {
      await this.prisma.pairingTable.deleteMany({
        where: {
          restaurantId: { in: restaurants.map((r) => r.id) },
        },
      });
    }

    // Delete all restaurants
    await this.prisma.pairingRestaurant.deleteMany({
      where: { eventId },
    });
  }
}
