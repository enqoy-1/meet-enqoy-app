import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class FriendInvitationsService {
  constructor(private prisma: PrismaService) {}

  async sendInvitation(inviterId: string, eventId: string, friendEmail: string, friendName?: string) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if venue has been revealed (48 hours before event)
    const now = new Date();
    const hoursUntilEvent = (new Date(event.startTime).getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent <= 48) {
      throw new BadRequestException('Friend invitations are not allowed once the venue has been revealed (48 hours before event)');
    }

    // Check if inviter has a booking
    const inviterBooking = await this.prisma.booking.findFirst({
      where: { userId: inviterId, eventId, status: 'confirmed' },
    });

    if (!inviterBooking) {
      throw new BadRequestException('You must have a confirmed booking to invite friends');
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration: 24 hours before event start
    const eventStart = new Date(event.startTime);
    const expiresAt = new Date(eventStart.getTime() - (24 * 60 * 60 * 1000));

    // Create invitation
    const invitation = await this.prisma.friendInvitation.create({
      data: {
        eventId,
        inviterId,
        friendEmail,
        friendName,
        token,
        expiresAt, // Expires 24 hours before event
      },
      include: {
        event: true,
        inviter: {
          include: {
            profile: true,
          },
        },
      },
    });

    // TODO: Send email with invitation link
    // Email should contain: invitation.token, event details, inviter name

    return invitation;
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.friendInvitation.findUnique({
      where: { token },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
        inviter: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if expired
    if (new Date() > invitation.expiresAt || invitation.status !== 'pending') {
      throw new BadRequestException('This invitation has expired or been used');
    }

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.getInvitationByToken(token);

    // Create booking for the friend
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        eventId: invitation.eventId,
        status: 'confirmed',
        amountPaid: invitation.event.price,
        invitedById: invitation.inviterId,
      },
    });

    // Mark invitation as accepted
    await this.prisma.friendInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return booking;
  }

  async bookForFriend(
    userId: string,
    eventId: string,
    friendData: { name: string; email: string; phone?: string },
  ) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if venue has been revealed (48 hours before event)
    const now = new Date();
    const hoursUntilEvent = (new Date(event.startTime).getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent <= 48) {
      throw new BadRequestException('Booking for friends is not allowed once the venue has been revealed (48 hours before event)');
    }

    // Check if user has a booking
    const userBooking = await this.prisma.booking.findFirst({
      where: { userId, eventId, status: 'confirmed' },
    });

    if (!userBooking) {
      throw new BadRequestException('You must have a confirmed booking to book for a friend');
    }

    // Create booking for friend
    const friendBooking = await this.prisma.booking.create({
      data: {
        userId, // Using the inviter's userId for payment
        eventId,
        status: 'confirmed',
        amountPaid: event.price,
        bookedForFriend: true,
        friendName: friendData.name,
        friendEmail: friendData.email,
        friendPhone: friendData.phone,
      },
    });

    return friendBooking;
  }

  async getMyInvitations(userId: string) {
    return this.prisma.friendInvitation.findMany({
      where: { inviterId: userId },
      include: {
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
