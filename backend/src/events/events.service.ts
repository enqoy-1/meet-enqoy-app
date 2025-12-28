import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        price: dto.price.toString(),
        twoEventsDiscountValue: dto.twoEventsDiscountValue
          ? dto.twoEventsDiscountValue.toString()
          : undefined,
      },
      include: {
        venue: true,
      },
    });
  }

  async findAll(includeHidden = false) {
    return this.prisma.event.findMany({
      where: includeHidden ? {} : { isVisible: true },
      include: {
        venue: true,
        bookings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        price: dto.price ? dto.price.toString() : undefined,
        twoEventsDiscountValue: dto.twoEventsDiscountValue !== undefined
          ? dto.twoEventsDiscountValue?.toString()
          : undefined,
      },
      include: {
        venue: true,
      },
    });
  }

  async delete(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Event deleted successfully' };
  }

  async getUpcomingEvents() {
    return this.prisma.event.findMany({
      where: {
        isVisible: true,
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        venue: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async getPastEvents() {
    return this.prisma.event.findMany({
      where: {
        startTime: {
          lt: new Date(),
        },
      },
      include: {
        venue: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }
}
