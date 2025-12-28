import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { format } from 'date-fns';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  async create(userId: string, dto: CreateBookingDto) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if event is within 48 hours (booking deadline)
    const now = new Date();
    const eventStartTime = new Date(event.startTime);
    const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 48) {
      throw new BadRequestException(
        'Bookings close 48 hours before the event. This event is too soon to book.'
      );
    }

    // Get user with profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        personalityAssessment: true,
      },
    });

    // Check if using credit
    if (dto.useCredit) {
      if (!user?.profile || user.profile.eventCredits < 1) {
        throw new BadRequestException('No event credits available');
      }
    } else {
      // Only require assessment for non-credit bookings
      if (!user?.profile?.assessmentCompleted) {
        throw new BadRequestException(
          'Please complete the personality assessment before booking an event',
        );
      }
    }

    // Check if user already has a booking for this event
    const existingBooking = await this.prisma.booking.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: dto.eventId,
        },
      },
    });

    if (existingBooking) {
      throw new ConflictException('You already have a booking for this event');
    }

    // Check if event is full (only if capacity is set)
    // Only count CONFIRMED bookings towards capacity (pending bookings don't reserve spots)
    if (event.capacity !== null && event.capacity !== undefined) {
      const bookingsCount = await this.prisma.booking.count({
        where: {
          eventId: dto.eventId,
          status: 'confirmed', // Only count confirmed bookings
        },
      });

      if (bookingsCount >= event.capacity) {
        throw new BadRequestException('Event is fully booked');
      }
    }

    // Calculate price based on options (admin-controlled)
    let totalPrice = Number(event.price);

    // Two events package with admin-controlled discount
    if (dto.twoEvents) {
      const twoEventsTotal = Number(event.price) * 2;

      if (event.twoEventsDiscountType === 'percentage' && event.twoEventsDiscountValue) {
        // Percentage discount (e.g., 20% off)
        const discountPercent = Number(event.twoEventsDiscountValue);
        const discountAmount = twoEventsTotal * (discountPercent / 100);
        totalPrice = twoEventsTotal - discountAmount;
        console.log(`Two-events: ${twoEventsTotal} ETB - ${discountPercent}% (${discountAmount} ETB) = ${totalPrice} ETB`);
      } else if (event.twoEventsDiscountType === 'fixed' && event.twoEventsDiscountValue) {
        // Fixed amount discount (e.g., 200 ETB off)
        const discountAmount = Number(event.twoEventsDiscountValue);
        totalPrice = Math.max(0, twoEventsTotal - discountAmount); // Don't go below 0
        console.log(`Two-events: ${twoEventsTotal} ETB - ${discountAmount} ETB = ${totalPrice} ETB`);
      } else {
        // No discount configured
        totalPrice = twoEventsTotal;
        console.log(`Two-events: ${twoEventsTotal} ETB (no discount)`);
      }
    }

    // Bring a friend - friend pays same price as event
    if (dto.bringFriend && dto.payForFriend) {
      const friendPrice = Number(event.price);
      totalPrice += friendPrice;
      console.log(`Bring friend (paid by inviter): +${friendPrice} ETB, Total: ${totalPrice} ETB`);
    }

    // Create the main booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        eventId: dto.eventId,
        // If using credit, confirm immediately. Otherwise, pending until payment verified
        status: dto.useCredit ? 'confirmed' : 'pending',
        paymentStatus: dto.useCredit ? 'credit_used' : 'pending',
        amountPaid: dto.useCredit ? '0' : totalPrice.toString(),
        usedCredit: dto.useCredit || false,
      },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    // Handle two-events purchase - add credit to user profile
    if (dto.twoEvents && !dto.useCredit) {
      await this.prisma.profile.update({
        where: { userId },
        data: {
          eventCredits: { increment: 1 },
        },
      });
    }

    // Handle using a credit - decrement credits
    if (dto.useCredit) {
      await this.prisma.profile.update({
        where: { userId },
        data: {
          eventCredits: { decrement: 1 },
        },
      });
    }

    // Handle bringing a friend
    if (dto.bringFriend && dto.friendEmail && dto.friendName) {
      if (dto.payForFriend) {
        // Booker pays for friend - create friend booking directly
        await this.createFriendBooking(
          userId,
          dto.eventId,
          dto.friendName,
          dto.friendEmail,
          dto.friendPhone || null,
          true, // paidByInviter
        );

        // Send "You got an invitation" email to friend
        await this.emailService.sendFriendPaidInvitation({
          to: dto.friendEmail,
          friendName: dto.friendName,
          inviterName: user?.profile?.firstName || user?.email?.split('@')[0] || 'Your friend',
          eventTitle: event.title,
          eventDate: format(new Date(event.startTime), "PPPP 'at' p"),
        });
      } else {
        // Friend pays themselves - send invitation with payment link
        const token = this.generateInvitationToken();

        await this.prisma.friendInvitation.create({
          data: {
            eventId: dto.eventId,
            inviterId: userId,
            friendEmail: dto.friendEmail,
            friendName: dto.friendName,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        // Send "Let's go together" email with payment option
        await this.emailService.sendFriendInvitation({
          to: dto.friendEmail,
          friendName: dto.friendName,
          inviterName: user?.profile?.firstName || user?.email?.split('@')[0] || 'Your friend',
          eventTitle: event.title,
          eventDate: format(new Date(event.startTime), "PPPP 'at' p"),
          invitationToken: token,
        });
      }
    }

    // Send booking confirmation email ONLY if booking was confirmed (used credit)
    // For regular bookings, confirmation email is sent by payment service after verification
    if (dto.useCredit && user && user.email) {
      const userName = user.profile?.firstName || user.email.split('@')[0];
      await this.emailService.sendBookingConfirmation({
        to: user.email,
        userName,
        eventTitle: event.title,
        eventDate: format(new Date(event.startTime), "PPPP 'at' p"),
        eventPrice: 0, // No payment needed - used credit
      });
    }

    return {
      ...booking,
      creditAdded: dto.twoEvents && !dto.useCredit,
      friendInvited: dto.bringFriend,
    };
  }

  private async createFriendBooking(
    inviterId: string,
    eventId: string,
    friendName: string,
    friendEmail: string,
    friendPhone: string | null,
    paidByInviter: boolean,
  ) {
    // Check if friend already has an account
    let friendUser = await this.prisma.user.findUnique({
      where: { email: friendEmail },
    });

    // If friend doesn't have an account, we'll track them by email in the booking
    // They can claim it later when they register

    return this.prisma.booking.create({
      data: {
        userId: friendUser?.id || inviterId, // Use inviter's ID if friend not registered
        eventId,
        status: paidByInviter ? 'confirmed' : 'pending',
        paymentStatus: paidByInviter ? 'paid_by_inviter' : 'pending',
        amountPaid: paidByInviter ? '0' : null,
        bookedForFriend: !friendUser, // True if friend not registered
        friendName: !friendUser ? friendName : null,
        friendEmail: !friendUser ? friendEmail : null,
        friendPhone: !friendUser ? friendPhone : null,
        invitedById: inviterId,
        paidByInviter,
        assessmentOptional: true, // Friends don't need assessment
      },
    });
  }

  private generateInvitationToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async findAllFiltered(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    paymentStatus?: string;
    eventType?: string;
    search?: string;
  } = {}) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.eventType && filters.eventType !== 'all') {
      where.event = { eventType: filters.eventType };
    }

    // Advanced search
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { profile: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { user: { profile: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
        { payment: { transactionId: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Payment status filter (handled differently as it's a relation or field)
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'pending_verification') {
        where.payment = { status: 'pending' };
      } else if (filters.paymentStatus === 'verified') {
        where.payment = { status: 'verified' };
      } else if (filters.paymentStatus === 'rejected') {
        where.payment = { status: 'rejected' };
      } else if (filters.paymentStatus === 'no_payment') {
        where.payment = null;
      }
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        event: {
          include: {
            venue: true,
          },
        },
        payment: true,
        invitedBy: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary stats
    const totalBookings = bookings.length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const pendingPaymentCount = bookings.filter(b => b.payment?.status === 'pending').length;
    const totalRevenue = bookings.reduce((sum, b) => {
      if (b.status === 'confirmed' || b.payment?.status === 'verified') {
        return sum + Number(b.payment?.amount || 0);
      }
      return sum;
    }, 0);

    return {
      bookings,
      summary: {
        total: totalBookings,
        confirmed: confirmedCount,
        pendingPayment: pendingPaymentCount,
        revenue: totalRevenue,
      },
    };
  }

  async findAll() {
    return this.findAllFiltered();
  }

  async findMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // If userId provided, check ownership
    if (userId && booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, userId?: string) {
    const booking = await this.findOne(id, userId);

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...dto,
        amountPaid: dto.amountPaid ? dto.amountPaid.toString() : undefined,
      },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
      },
    });
  }

  async cancel(id: string, userId?: string) {
    const booking = await this.findOne(id, userId);

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    return { message: 'Booking deleted successfully' };
  }

  async confirmAllForEvent(eventId: string) {
    const result = await this.prisma.booking.updateMany({
      where: {
        eventId,
        status: { not: 'confirmed' },
      },
      data: {
        status: 'confirmed',
      },
    });

    return {
      message: `Confirmed ${result.count} booking(s)`,
      count: result.count,
    };
  }

  // Get user's event credits
  async getUserCredits(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { eventCredits: true },
    });
    return { credits: profile?.eventCredits || 0 };
  }
}
