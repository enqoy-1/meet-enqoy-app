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
import { CreditsService } from '../credits/credits.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private creditsService: CreditsService,
  ) { }

  async create(userId: string, dto: CreateBookingDto) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if event is within cutoff hours (booking deadline)
    const now = new Date();
    const eventStartTime = new Date(event.startTime);
    const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const cutoffHours = event.bookingCutoffHours ?? 24;

    if (hoursUntilEvent < cutoffHours) {
      throw new BadRequestException(
        `Bookings close ${cutoffHours} hours before the event. This event is too soon to book.`
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
      // Use creditsService for validation
      const canUse = await this.creditsService.canUseCreditForEvent(userId, dto.eventId);
      if (!canUse) {
        throw new BadRequestException('No eligible event credits available');
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
      // If it's a cancelled booking, we can allow re-booking
      if (existingBooking.status === 'cancelled') {
        // We'll delete the cancelled booking so we can create a new one
        await this.prisma.booking.delete({
          where: { id: existingBooking.id },
        });
      } else {
        throw new ConflictException('You already have a booking for this event');
      }
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
      } else if (event.twoEventsDiscountType === 'fixed' && event.twoEventsDiscountValue) {
        // Fixed amount discount (e.g., 200 ETB off)
        const discountAmount = Number(event.twoEventsDiscountValue);
        totalPrice = Math.max(0, twoEventsTotal - discountAmount); // Don't go below 0
      } else {
        // No discount configured
        totalPrice = twoEventsTotal;
      }
    }

    // Bring a friend - friend pays same price as event
    if (dto.bringFriend && dto.payForFriend) {
      const friendPrice = Number(event.price);
      totalPrice += friendPrice;
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
        purchasedTwoEvents: dto.twoEvents && !dto.useCredit,
        creditGranted: false, // Will be set to true when payment is confirmed
      },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    // NOTE: Credit is NOT added immediately for two-events purchases
    // Credit will be added when the booking is confirmed (payment verified)
    // See the confirmBooking method below

    // Handle using a credit - decrement credits using service
    if (dto.useCredit) {
      await this.creditsService.useCredit(
        userId,
        booking.id,
        booking.eventId,
        `Used for event booking: ${event.title}`
      );
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
      creditPending: dto.twoEvents && !dto.useCredit, // Credit will be added when payment is confirmed
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
        { user: { profile: { phone: { contains: filters.search, mode: 'insensitive' } } } },
        { payment: { transactionId: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Payment status filter (handled differently as it's a relation or field)
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'pending_verification') {
        // Show bookings that either:
        // 1. Have a payment record with status 'pending' (awaiting verification)
        // 2. Have booking status 'pending' and no payment record (awaiting payment submission)
        where.OR = [
          { payment: { status: 'pending' } },
          {
            AND: [
              { status: 'pending' },
              { payment: null }
            ]
          }
        ];
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
    // Pending payment count: bookings awaiting verification OR awaiting payment submission
    const pendingPaymentCount = bookings.filter(b =>
      b.payment?.status === 'pending' || (b.status === 'pending' && !b.payment)
    ).length;
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

    // Check cutoff hours
    const now = new Date();
    const eventStartTime = new Date(booking.event.startTime);
    const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const cutoffHours = booking.event.bookingCutoffHours ?? 24;

    // Allow cancelling only up to 48h before event if policy requires (for reschedule/cancel)
    // Or stick to bookingCurtoffHours. Let's use 48h for now as it's the venue reveal time
    if (hoursUntilEvent < 48) {
      throw new BadRequestException('Cannot cancel bookings within 48 hours of the event');
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

  async confirmBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          include: {
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

    if (booking.status === 'confirmed') {
      throw new BadRequestException('Booking is already confirmed');
    }

    // Update booking to confirmed
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'confirmed',
        paymentStatus: 'verified',
      },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    // Grant credit if this was a two-events purchase and credit hasn't been granted yet
    if (booking.purchasedTwoEvents && !booking.creditGranted) {
      // Use creditsService to grant credit
      await this.creditsService.earnCredit(
        booking.userId,
        booking.id,
        booking.eventId,
        `Credit earned from booking: ${booking.event.title}`
      );

      // Mark credit as granted on booking
      await this.prisma.booking.update({
        where: { id },
        data: {
          creditGranted: true,
        },
      });

      console.log(`✓ Credit granted to user ${booking.userId} for two-events purchase (booking ${id})`);
    }

    return updatedBooking;
  }

  async rejectPayment(id: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        payment: true,
        event: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Update payment status to rejected if payment exists
    if (booking.payment) {
      await this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: 'rejected',
          rejectionReason: reason || 'Payment verification failed',
        },
      });
    }

    // Cancel the booking
    await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });

    return {
      message: 'Payment rejected and booking cancelled',
      bookingId: id,
      reason: reason || 'Payment verification failed',
    };
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
    return this.creditsService.getUserCredits(userId);
  }

  async reschedule(bookingId: string, newEventId: string, userId: string) {
    // 1. Get original booking
    const booking = await this.findOne(bookingId, userId);

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot reschedule a cancelled booking');
    }

    // 2. Validate timing (must be > 48h before event)
    const now = new Date();
    const eventStartTime = new Date(booking.event.startTime);
    const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 48) {
      throw new BadRequestException('Rescheduling is only allowed up to 48 hours before the event');
    }

    // 3. Get new event
    const newEvent = await this.prisma.event.findUnique({
      where: { id: newEventId }
    });

    if (!newEvent) {
      throw new NotFoundException('New event not found');
    }

    // 4. Validate same price
    // Note: We compare as numbers to be safe, assuming price is stored as string
    if (Number(booking.event.price) !== Number(newEvent.price)) {
      throw new BadRequestException('Can only reschedule to an event with the same price');
    }

    // 5. Check capacity of new event
    if (newEvent.capacity) {
      const bookingsCount = await this.prisma.booking.count({
        where: {
          eventId: newEventId,
          status: 'confirmed'
        }
      });

      if (bookingsCount >= newEvent.capacity) {
        throw new BadRequestException('New event is fully booked');
      }
    }

    // 6. Execute reschedule transaction: Cancel old -> Create new
    return this.prisma.$transaction(async (prisma) => {
      // Cancel old booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          // Keep payment status but maybe mark as "transferred"? 
          // Currently system keeps 'verified' which is fine as we don't refund
        }
      });

      // Create new booking
      const newBooking = await prisma.booking.create({
        data: {
          userId,
          eventId: newEventId,
          status: 'confirmed', // Auto-confirm since it's a reschedule of a paid booking
          paymentStatus: booking.paymentStatus, // Inherit payment status
          amountPaid: booking.amountPaid,
          sourceEventId: booking.eventId, // Track origin
          // Copy other relevant fields
          assessmentOptional: booking.assessmentOptional,
        },
        include: {
          event: {
            include: { venue: true }
          }
        }
      });

      return newBooking;
    });
  }
}
