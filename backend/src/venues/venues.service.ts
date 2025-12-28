import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.venue.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        events: true,
      },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  async update(id: string, dto: UpdateVenueDto) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.prisma.venue.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    await this.prisma.venue.delete({
      where: { id },
    });

    return { message: 'Venue deleted successfully' };
  }
}
