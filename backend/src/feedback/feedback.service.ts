import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async createFeedback(userId: string, data: any) {
    return this.prisma.feedback.create({
      data: {
        userId,
        eventId: data.eventId,
        rating: data.rating,
        comments: data.comments,
        data: data.data,
      },
      include: {
        user: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
  }

  async getMyFeedback(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllFeedback() {
    return this.prisma.feedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getFeedbackByEvent(eventId: string) {
    return this.prisma.feedback.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
