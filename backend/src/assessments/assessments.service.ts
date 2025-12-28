import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class AssessmentsService implements OnModuleInit {
  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    await this.seedInitialQuestions();
  }

  // Get all questions
  async getQuestions() {
    return this.prisma.assessmentQuestion.findMany({
      orderBy: {
        order: 'asc',
      },
    });
  }

  // Get user's assessment
  async getUserAssessment(userId: string) {
    return this.prisma.personalityAssessment.findUnique({
      where: { userId },
    });
  }

  // Submit assessment
  async submitAssessment(userId: string, answers: any) {
    // Upsert assessment
    const assessment = await this.prisma.personalityAssessment.upsert({
      where: { userId },
      update: { answers },
      create: { userId, answers },
    });

    // Mark profile as assessment completed
    await this.prisma.profile.update({
      where: { userId },
      data: { assessmentCompleted: true },
    });

    return assessment;
  }

  // Update a single answer in the assessment
  async updateAnswer(userId: string, questionKey: string, newValue: any) {
    const existing = await this.prisma.personalityAssessment.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Assessment not found');
    }

    const currentAnswers = existing.answers as any;
    const updatedAnswers = { ...currentAnswers, [questionKey]: newValue };

    return this.prisma.personalityAssessment.update({
      where: { userId },
      data: { answers: updatedAnswers },
    });
  }

  // Admin: Create question
  async createQuestion(dto: CreateQuestionDto) {
    let order = dto.order;
    if (order === undefined) {
      const maxOrder = await this.prisma.assessmentQuestion.findFirst({
        orderBy: { order: 'desc' },
      });
      order = (maxOrder?.order || 0) + 1;
    }

    return this.prisma.assessmentQuestion.create({
      data: {
        ...dto,
        order,
        options: dto.options as any,
      },
    });
  }

  // Admin: Update question
  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    return this.prisma.assessmentQuestion.update({
      where: { id },
      data: {
        ...dto,
        options: dto.options ? (dto.options as any) : undefined,
      },
    });
  }

  // Admin: Delete question
  async deleteQuestion(id: string) {
    await this.prisma.assessmentQuestion.delete({
      where: { id },
    });
    return { message: 'Question deleted successfully' };
  }

  // Admin: Reorder questions
  async reorderQuestions(items: { id: string; order: number }[]) {
    const transaction = items.map((item) =>
      this.prisma.assessmentQuestion.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    );
    return this.prisma.$transaction(transaction);
  }

  // Admin: Get all responses
  async getAllResponses() {
    return this.prisma.personalityAssessment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });
  }

  // Initial Seeder to migrate hardcoded questions to DB
  private async seedInitialQuestions() {
    try {
      const count = await this.prisma.assessmentQuestion.count();
      if (count > 0) return; // Already seeded

      console.log('Seeding initial assessment questions...');

      const questions = [
        // ========== CONTACT / SETUP (No scoring) ==========
        {
          key: 'phone',
          label: 'Phone Number',
          type: 'text',
          section: 'contact',
          order: 1,
          options: []
        },
        {
          key: 'city',
          label: 'Which city would you like to attend Enqoy from?',
          type: 'radio',
          section: 'contact',
          order: 2,
          options: [
            { value: 'addis', label: 'Addis Ababa' },
            { value: 'outside', label: 'Outside Addis Ababa' },
          ]
        },
        // ========== SOCIAL ==========
        {
          key: 'preferredTime',
          label: 'Would you prefer to attend during lunch or dinner?',
          type: 'radio',
          section: 'social',
          order: 3,
          options: [
            { value: 'dinner', label: 'Dinner (7pm - 9pm)' },
            { value: 'lunch', label: 'Lunch (2pm - 4pm)' },
          ]
        },
        {
          key: 'dinnerVibe',
          label: 'Which statement best describes your vibe at dinner?',
          type: 'radio',
          section: 'social',
          order: 4,
          options: [
            { value: 'steering', label: 'I love steering the conversation', scores: { Storytellers: 6, Trailblazers: 3 } },
            { value: 'sharing', label: 'I enjoy sharing stories', scores: { Storytellers: 3 } },
            { value: 'observing', label: 'I prefer to quietly observe', scores: { Philosophers: 4, Planners: 4 } },
            { value: 'adapting', label: 'I adapt to whatever the group needs', scores: { 'Free Spirits': 6 } },
          ]
        },
        {
          key: 'talkTopic',
          label: 'If you could talk about one topic all night, what would it be?',
          type: 'radio',
          section: 'social',
          order: 5,
          options: [
            { value: 'current_events', label: 'Current events and world issues', scores: { Philosophers: 1, Planners: 3 } },
            { value: 'arts', label: 'Arts, entertainment, and pop culture', scores: { Storytellers: 2, 'Free Spirits': 2 } },
            { value: 'personal_growth', label: 'Personal growth and philosophy', scores: { Philosophers: 3 } },
            { value: 'experiences', label: 'Food, travel, and experiences', scores: { Trailblazers: 2, 'Free Spirits': 2 } },
            { value: 'hobbies', label: 'Hobbies and niche interests', scores: { Trailblazers: 2, Storytellers: 2 } },
          ]
        },
        {
          key: 'groupDynamic',
          label: 'What does your ideal group dynamic look like?',
          type: 'radio',
          section: 'social',
          order: 6,
          options: [
            { value: 'similar', label: 'Similar personalities', scores: { Storytellers: 2, Planners: 2, Philosophers: 2 } },
            { value: 'diverse', label: 'Diverse viewpoints', scores: { Trailblazers: 2, 'Free Spirits': 2 } },
          ]
        },
        // ========== PERSONALITY ==========
        {
          key: 'humorType',
          label: 'What kind of humor do you enjoy?',
          type: 'radio',
          section: 'personality',
          order: 7,
          options: [
            { value: 'sarcastic', label: 'Sarcastic & Dry', scores: { Storytellers: 1 } },
            { value: 'playful', label: 'Playful & Lighthearted', scores: { Storytellers: 1, 'Free Spirits': 1, Trailblazers: 1 } },
            { value: 'witty', label: 'Witty & Clever', scores: { Philosophers: 1, Storytellers: 1 } },
            { value: 'none', label: 'Not a huge fan of jokes', scores: { Philosophers: 1, Planners: 1 } },
          ]
        },
        {
          key: 'wardrobeStyle',
          label: 'If your personality were a wardrobe, would it be filled with...',
          type: 'radio',
          section: 'personality',
          order: 8,
          options: [
            { value: 'classics', label: 'Timeless Classics', scores: { Planners: 4, Philosophers: 1 } },
            { value: 'trendy', label: 'Bold & Trendy', scores: { Trailblazers: 3, Storytellers: 1, 'Free Spirits': 1 } },
          ]
        },
        {
          key: 'introvertScale',
          label: 'I am an introverted person',
          type: 'scale',
          section: 'personality',
          order: 9,
          options: [
            { value: '1', label: 'Strongly Disagree', scores: { Trailblazers: 1, Storytellers: 1 } },
            { value: '2', label: 'Disagree', scores: { Trailblazers: 1, Storytellers: 1 } },
            { value: '3', label: 'Neutral', scores: { 'Free Spirits': 1 } },
            { value: '4', label: 'Agree', scores: { Philosophers: 2, Planners: 2 } },
            { value: '5', label: 'Strongly Agree', scores: { Philosophers: 2, Planners: 2 } },
          ]
        },
        {
          key: 'aloneTimeScale',
          label: 'I enjoy spending time alone to recharge and reflect',
          type: 'scale',
          section: 'personality',
          order: 10,
          options: [
            { value: '1', label: 'Strongly Disagree', scores: { Trailblazers: 1 } },
            { value: '2', label: 'Disagree', scores: { Storytellers: 1 } },
            { value: '3', label: 'Neutral', scores: { 'Free Spirits': 1 } },
            { value: '4', label: 'Agree', scores: { Philosophers: 1, Planners: 1 } },
            { value: '5', label: 'Strongly Agree', scores: { Philosophers: 2, Planners: 1 } },
          ]
        },
        {
          key: 'familyScale',
          label: 'How important is staying close to family and loved ones?',
          type: 'scale',
          section: 'personality',
          order: 11,
          options: [
            { value: '1', label: 'Not Important', scores: { Trailblazers: 1, 'Free Spirits': 1 } },
            { value: '2', label: 'Slightly Important', scores: { Trailblazers: 1 } },
            { value: '3', label: 'Neutral', scores: { 'Free Spirits': 1 } },
            { value: '4', label: 'Important', scores: { Planners: 1, Storytellers: 1 } },
            { value: '5', label: 'Very Important', scores: { Planners: 2, Philosophers: 1 } },
          ]
        },
        {
          key: 'spiritualityScale',
          label: 'How important is having a sense of spirituality or deeper meaning in life?',
          type: 'scale',
          section: 'personality',
          order: 12,
          options: [
            { value: '1', label: 'Not Important', scores: { 'Free Spirits': 1 } },
            { value: '2', label: 'Slightly Important', scores: { Trailblazers: 1 } },
            { value: '3', label: 'Neutral', scores: { Storytellers: 1 } },
            { value: '4', label: 'Important', scores: { Philosophers: 1 } },
            { value: '5', label: 'Very Important', scores: { Philosophers: 2, Planners: 1 } },
          ]
        },
        {
          key: 'humorScale',
          label: 'How important is sharing laughter and enjoying humor with others?',
          type: 'scale',
          section: 'personality',
          order: 13,
          options: [
            { value: '1', label: 'Not Important', scores: { Philosophers: 1, Planners: 1 } },
            { value: '2', label: 'Slightly Important', scores: { Philosophers: 1 } },
            { value: '3', label: 'Neutral', scores: { 'Free Spirits': 1 } },
            { value: '4', label: 'Important', scores: { Storytellers: 1, Trailblazers: 1 } },
            { value: '5', label: 'Very Important', scores: { Storytellers: 2, 'Free Spirits': 1 } },
          ]
        },
        {
          key: 'meetingPriority',
          label: "What's most important to you when meeting new people?",
          type: 'radio',
          section: 'social',
          order: 14,
          options: [
            { value: 'shared_values', label: 'Shared values and interests', scores: { Philosophers: 1, Planners: 1 } },
            { value: 'engaging', label: 'Fun and engaging conversations', scores: { Storytellers: 1, Trailblazers: 1 } },
            { value: 'learning', label: 'Learning something new from others', scores: { Philosophers: 1, Trailblazers: 1 } },
            { value: 'connection', label: 'Feeling a sense of connection', scores: { 'Free Spirits': 2 } },
          ]
        },
        // ========== LIFESTYLE ==========
        {
          key: 'dietaryPreferences',
          label: 'Do you have any dietary preferences or restrictions?',
          type: 'radio',
          section: 'lifestyle',
          order: 15,
          options: [
            { value: 'none', label: 'None' },
            { value: 'fasting', label: 'Fasting' },
            { value: 'vegan', label: 'Vegan' },
            { value: 'gluten_free', label: 'Gluten-free' },
            { value: 'other', label: 'Other' },
          ]
        },
        {
          key: 'restaurantFrequency',
          label: 'How often do you go out to restaurants every month?',
          type: 'radio',
          section: 'lifestyle',
          order: 16,
          options: [
            { value: '1-2', label: '1-2 times' },
            { value: '3-5', label: '3-5 times' },
            { value: '6+', label: '6+ times' },
          ]
        },
        {
          key: 'spending',
          label: 'How much do you usually spend on yourself when out with friends?',
          type: 'radio',
          section: 'lifestyle',
          order: 17,
          options: [
            { value: '500-1000', label: '500 - 1000 ETB' },
            { value: '1000-1500', label: '1000 - 1500 ETB' },
            { value: '1500+', label: '1500+ ETB' },
          ]
        },
        // ========== PERSONAL ==========
        {
          key: 'gender',
          label: 'What is your gender?',
          type: 'radio',
          section: 'personal',
          order: 18,
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
            { value: 'prefer_not_to_say', label: 'Prefer not to say' },
          ]
        },
        {
          key: 'relationshipStatus',
          label: 'What is your relationship status?',
          type: 'radio',
          section: 'personal',
          order: 19,
          options: [
            { value: 'single', label: 'Single' },
            { value: 'dating', label: 'Dating' },
            { value: 'in_relationship', label: 'In a relationship' },
            { value: 'married', label: 'Married' },
          ]
        },
        {
          key: 'hasChildren',
          label: 'Do you have children?',
          type: 'radio',
          section: 'personal',
          order: 20,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]
        },
        {
          key: 'country',
          label: 'Which country are you from?',
          type: 'select',
          section: 'personal',
          order: 21,
          options: [] // Too many countries, handled client-side
        },
        {
          key: 'birthday',
          label: 'When is your birthday?',
          type: 'date',
          section: 'personal',
          order: 22,
          options: []
        },
        // ========== FUN FACTS ==========
        {
          key: 'nickName',
          label: 'What nickname would you like us to call you?',
          type: 'text',
          section: 'fun',
          order: 23,
          options: []
        },
        {
          key: 'neverGuess',
          label: 'Something you would never guess about me is...',
          type: 'text',
          section: 'fun',
          order: 24,
          options: []
        },
        {
          key: 'funFact',
          label: 'Share a fun fact about yourself',
          type: 'text',
          section: 'fun',
          order: 25,
          options: []
        },
      ];

      for (const q of questions) {
        await this.prisma.assessmentQuestion.create({
          data: {
            key: q.key,
            label: q.label,
            type: q.type,
            section: q.section,
            order: q.order,
            options: q.options as any,
          }
        });
      }
      console.log(`Seeded ${questions.length} assessment questions.`);
    } catch (e) {
      console.error('Failed to seed assessment questions. Prisma client might need generation.', e);
    }
  }
}
