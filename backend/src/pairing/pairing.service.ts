import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PairingService {
  constructor(private prisma: PrismaService) { }

  // Get all guests for an event
  async getEventGuests(eventId: string) {
    return this.prisma.pairingGuest.findMany({
      where: { eventId },
      include: {
        pairsAsGuest1: true,
        pairsAsGuest2: true,
        assignments: {
          include: {
            table: {
              include: {
                restaurant: true,
              },
            },
          },
        },
        constraintsAsGuest1: true,
        constraintsAsGuest2: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  // Get all pairs for an event
  async getEventPairs(eventId: string) {
    const guests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
    });

    const guestIds = guests.map((g) => g.id);

    return this.prisma.pairingPair.findMany({
      where: {
        guest1Id: { in: guestIds },
      },
      include: {
        guest1: true,
        guest2: true,
      },
    });
  }

  // Get all restaurants for an event
  async getEventRestaurants(eventId: string) {
    return this.prisma.pairingRestaurant.findMany({
      where: { eventId },
      include: {
        tables: {
          include: {
            assignments: {
              include: {
                guest: true,
              },
            },
          },
        },
      },
    });
  }

  // Get all constraints
  async getConstraints(eventId: string) {
    const guests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
    });

    const guestIds = guests.map((g) => g.id);

    return this.prisma.pairingConstraint.findMany({
      where: {
        guest1Id: { in: guestIds },
      },
      include: {
        guest1: true,
        guest2: true,
      },
    });
  }

  // Create guest
  async createGuest(data: any) {
    return this.prisma.pairingGuest.create({
      data,
    });
  }

  // Create pair
  async createPair(guest1Id: string, guest2Id: string, score?: number) {
    return this.prisma.pairingPair.create({
      data: {
        guest1Id,
        guest2Id,
        score: score ? score.toString() : undefined,
      },
      include: {
        guest1: true,
        guest2: true,
      },
    });
  }

  // Create assignment
  async createAssignment(guestId: string, tableId: string | null = null, restaurantId: string | null = null, seatNumber?: number, groupName?: string) {
    return this.prisma.pairingAssignment.upsert({
      where: {
        guestId,
      },
      update: {
        tableId,
        restaurantId,
        seatNumber,
        groupName,
        status: 'pending',
      },
      create: {
        guestId,
        tableId,
        restaurantId,
        seatNumber,
        groupName,
        status: 'pending',
      },
      include: {
        guest: true,
        table: true,
      },
    });
  }

  // Create restaurant
  async createRestaurant(data: any) {
    return this.prisma.pairingRestaurant.create({
      data,
    });
  }

  // Create table
  async createTable(data: any) {
    return this.prisma.pairingTable.create({
      data,
    });
  }

  // Delete table
  async deleteTable(tableId: string) {
    return this.prisma.pairingTable.delete({
      where: { id: tableId },
    });
  }

  // Audit log
  async logAction(action: string, entityType: string, entityId: string, changes?: any, performedBy?: string) {
    return this.prisma.pairingAuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        changes,
        performedBy,
      },
    });
  }

  // Create constraint
  async createConstraint(data: {
    guest1Id: string;
    guest2Id: string;
    type: 'must_pair' | 'avoid_pair';
    reason?: string;
  }) {
    return this.prisma.pairingConstraint.create({
      data: {
        guest1Id: data.guest1Id,
        guest2Id: data.guest2Id,
        type: data.type,
        reason: data.reason,
      },
      include: {
        guest1: true,
        guest2: true,
      },
    });
  }

  // Delete constraint
  async deleteConstraint(id: string) {
    return this.prisma.pairingConstraint.delete({
      where: { id },
    });
  }

  // Delete assignment
  async deleteAssignment(id: string) {
    return this.prisma.pairingAssignment.delete({
      where: { id },
    });
  }

  // Update assignment
  async updateAssignment(id: string, data: { tableId?: string; seatNumber?: number; status?: string }) {
    return this.prisma.pairingAssignment.update({
      where: { id },
      data: {
        tableId: data.tableId,
        seatNumber: data.seatNumber,
        status: data.status as any,
      },
      include: {
        guest: true,
        table: true,
      },
    });
  }

  // Update restaurant
  async updateRestaurant(id: string, data: { name?: string; address?: string; capacity?: number; contactInfo?: string }) {
    return this.prisma.pairingRestaurant.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        capacity: data.capacity,
        contactInfo: data.contactInfo,
      },
    });
  }

  // Get event assignments
  async getEventAssignments(eventId: string) {
    const restaurants = await this.prisma.pairingRestaurant.findMany({
      where: { eventId },
      include: {
        tables: {
          include: {
            assignments: {
              include: {
                guest: true,
              },
            },
          },
        },
        assignments: {
          include: {
            guest: true,
          }
        }
      },
    });

    // Flatten the assignments
    const assignments = restaurants.flatMap(r => {
      const tableAssignments = r.tables.flatMap(t =>
        t.assignments.map(a => ({
          ...a,
          restaurantId: r.id,
        }))
      );

      const directAssignments = (r.assignments || []).map(a => ({
        ...a,
        restaurantId: r.id,
      }));

      return [...tableAssignments, ...directAssignments];
    });

    return assignments;
  }

  // Get user's restaurant assignment for a specific event
  async getUserAssignment(userId: string, eventId: string) {
    // Find the guest record for this user and event
    const guest = await this.prisma.pairingGuest.findFirst({
      where: {
        userId,
        eventId,
      },
      include: {
        assignments: {
          include: {
            restaurant: true,
            table: true,
          },
        },
      },
    });

    if (!guest || !guest.assignments || guest.assignments.length === 0) {
      return null;
    }

    // Get the assignment (should only be one per guest)
    const assignment = guest.assignments[0];

    return {
      groupName: assignment.groupName,
      restaurant: assignment.restaurant ? {
        id: assignment.restaurant.id,
        name: assignment.restaurant.name,
        address: assignment.restaurant.address,
        googleMapsUrl: assignment.restaurant.googleMapsUrl,
        contactInfo: assignment.restaurant.contactInfo,
      } : null,
      status: assignment.status,
    };
  }
}
