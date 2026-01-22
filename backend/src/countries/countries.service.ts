import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCountryDto) {
    return this.prisma.country.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.country.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findActive() {
    return this.prisma.country.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async findByCode(code: string) {
    const country = await this.prisma.country.findUnique({
      where: { code },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async update(id: string, dto: UpdateCountryDto) {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return this.prisma.country.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    await this.prisma.country.delete({
      where: { id },
    });

    return { message: 'Country deleted successfully' };
  }
}
