import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SnapshotsService {
  constructor(private prisma: PrismaService) {}

  async getByEvent(eventId: string) {
    return this.prisma.attendeeSnapshot.findMany({
      where: { eventId },
      include: {
        event: true,
      },
    });
  }

  async create(eventId: string, snapshotData: any) {
    return this.prisma.attendeeSnapshot.create({
      data: {
        eventId,
        snapshotData,
      },
    });
  }

  async update(id: string, snapshotData: any) {
    return this.prisma.attendeeSnapshot.update({
      where: { id },
      data: { snapshotData },
    });
  }
}
