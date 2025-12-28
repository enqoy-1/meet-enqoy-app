import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IcebreakersService {
  constructor(private prisma: PrismaService) {}

  async getActiveQuestions() {
    return this.prisma.icebreakerQuestion.findMany({
      where: { isActive: true },
    });
  }

  async getAllQuestions() {
    return this.prisma.icebreakerQuestion.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createQuestion(question: string) {
    return this.prisma.icebreakerQuestion.create({
      data: {
        question,
        isActive: true,
      },
    });
  }

  async updateQuestion(id: string, data: any) {
    const question = await this.prisma.icebreakerQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.icebreakerQuestion.update({
      where: { id },
      data,
    });
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.icebreakerQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.prisma.icebreakerQuestion.delete({
      where: { id },
    });

    return { message: 'Question deleted successfully' };
  }
}
