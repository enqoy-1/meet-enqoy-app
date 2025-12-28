import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateOutsideCityInterestDto {
  city: string;
}

@Injectable()
export class OutsideCityInterestsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOutsideCityInterestDto) {
    return this.prisma.outsideCityInterest.create({
      data: {
        userId,
        city: dto.city,
      },
    });
  }

  async getByUser(userId: string) {
    return this.prisma.outsideCityInterest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAll() {
    return this.prisma.outsideCityInterest.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string) {
    return this.prisma.outsideCityInterest.delete({
      where: { id },
    });
  }
}
