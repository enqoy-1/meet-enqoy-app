import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IcebreakersService {
  constructor(private prisma: PrismaService) { }

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

  async createQuestion(question: string, isActive: boolean = false, category: string = "Icebreakers") {
    return this.prisma.icebreakerQuestion.create({
      data: {
        question,
        isActive,
        category,
      },
    });
  }

  async createAIGeneratedQuestions(questions: string[], eventId: string, groupName?: string) {
    // Filter out duplicates before creating
    const existingQuestions = await this.prisma.icebreakerQuestion.findMany({
      where: {
        question: { in: questions },
      },
      select: { question: true },
    });

    const existingQuestionsSet = new Set(existingQuestions.map(q => q.question));
    const newQuestions = questions.filter(q => !existingQuestionsSet.has(q));

    if (newQuestions.length === 0) {
      return { created: 0, skipped: questions.length };
    }

    // Create new AI-generated questions
    const created = await this.prisma.icebreakerQuestion.createMany({
      data: newQuestions.map(question => ({
        question,
        isActive: false,
        isAIGenerated: true,
        eventId,
        groupName,
      })),
    });

    return {
      created: created.count,
      skipped: questions.length - newQuestions.length,
    };
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
