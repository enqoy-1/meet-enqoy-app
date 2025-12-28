import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Faker-like data generation
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];

const getRandomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const generateEmail = (firstName: string, lastName: string): string => {
    const domain = getRandomItem(domains);
    const randomNum = Math.floor(Math.random() * 999);
    return `sandbox.${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`;
};

const generatePhone = (): string => {
    const prefix = '+251';
    const number = Math.floor(900000000 + Math.random() * 100000000);
    return `${prefix}${number}`;
};

@Injectable()
export class SandboxService {
    constructor(private prisma: PrismaService) { }

    // Get current sandbox time state
    async getTimeState() {
        let state = await this.prisma.sandboxTimeState.findFirst({
            where: { isActive: true },
        });

        if (!state) {
            // Create default state
            state = await this.prisma.sandboxTimeState.create({
                data: {
                    simulatedTime: new Date(),
                    isActive: false,
                },
            });
        }

        return {
            isFrozen: state.isActive,
            frozenTime: state.simulatedTime?.toISOString() || null,
        };
    }

    // Freeze time at specific datetime
    async freezeTime(datetime: Date) {
        // Deactivate any existing states
        await this.prisma.sandboxTimeState.updateMany({
            data: { isActive: false },
        });

        // Create or update time state
        const existing = await this.prisma.sandboxTimeState.findFirst();

        if (existing) {
            return this.prisma.sandboxTimeState.update({
                where: { id: existing.id },
                data: {
                    simulatedTime: datetime,
                    isActive: true,
                },
            });
        }

        return this.prisma.sandboxTimeState.create({
            data: {
                simulatedTime: datetime,
                isActive: true,
            },
        });
    }

    // Reset to real time
    async resetTime() {
        await this.prisma.sandboxTimeState.updateMany({
            data: {
                isActive: false,
                simulatedTime: new Date(),
            },
        });
        return { success: true };
    }

    // Get sandbox time (frozen or real)
    async getSandboxTime(): Promise<Date> {
        const state = await this.getTimeState();
        if (state.isFrozen && state.frozenTime) {
            return new Date(state.frozenTime);
        }
        return new Date();
    }

    // Create sandbox users
    async createSandboxUsers(count: number = 10) {
        const users = [];
        const hashedPassword = await bcrypt.hash('sandbox123', 10);

        // Personality assessment answer options
        const talkTopics = ['Current events and world issues', 'Arts, entertainment, and pop culture', 'Personal growth and philosophy', 'Food, travel, and experiences', 'Hobbies and niche interests'];
        const groupDynamics = ['A mix of people with shared interests and similar personalities', 'A diverse group with different viewpoints and experiences'];
        const dinnerVibes = ['steering', 'sharing', 'observing', 'adapting'];
        const humorTypes = ['sarcastic', 'playful', 'witty', 'not_a_fan'];
        const wardrobeStyles = ['timeless', 'bold'];
        const meetingPriorities = ['Shared values and interests', 'Fun and engaging conversations', 'Learning something new from others', 'Feeling a sense of connection'];
        const spendingOptions = ['500-1000', '1000-1500', '1500+'];

        for (let i = 0; i < count; i++) {
            const firstName = getRandomItem(firstNames);
            const lastName = getRandomItem(lastNames);
            const email = generateEmail(firstName, lastName);
            const age = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
            const genders: ('male' | 'female' | 'non_binary' | 'prefer_not_to_say')[] = ['male', 'female'];
            const gender = getRandomItem(genders);

            // Generate random personality assessment answers
            const assessmentAnswers = {
                talkTopic: getRandomItem(talkTopics),
                groupDynamic: getRandomItem(groupDynamics),
                dinnerVibe: getRandomItem(dinnerVibes),
                humorType: getRandomItem(humorTypes),
                wardrobeStyle: getRandomItem(wardrobeStyles),
                introvertScale: Math.floor(Math.random() * 5) + 1,
                aloneTimeScale: Math.floor(Math.random() * 5) + 1,
                familyScale: Math.floor(Math.random() * 5) + 1,
                spiritualityScale: Math.floor(Math.random() * 5) + 1,
                humorScale: Math.floor(Math.random() * 5) + 1,
                meetingPriority: getRandomItem(meetingPriorities),
                spending: getRandomItem(spendingOptions),
                gender: gender,
            };

            try {
                // Create user with profile AND personality assessment
                const user = await this.prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        profile: {
                            create: {
                                firstName,
                                lastName,
                                phone: generatePhone(),
                                age,
                                gender,
                                assessmentCompleted: true,
                            },
                        },
                        personalityAssessment: {
                            create: {
                                answers: assessmentAnswers,
                            },
                        },
                    },
                    include: {
                        profile: true,
                        personalityAssessment: true,
                    },
                });

                users.push({
                    id: user.id,
                    email: user.email,
                    fullName: `${firstName} ${lastName}`,
                    age,
                    gender,
                    assessmentCompleted: true,
                    hasPersonalityAssessment: !!user.personalityAssessment,
                });
            } catch (error) {
                console.error(`Failed to create sandbox user ${email}:`, error);
                continue;
            }
        }

        return users;
    }

    // Create sandbox events
    async createSandboxEvents(count: number = 3, daysFromNow: number = 7) {
        const events = [];
        const eventTitles = [
            'Casual Dinner Networking',
            'Professional Lunch Meetup',
            'Weekend Brunch Social',
            'Evening Cocktails & Conversation',
            'Coffee & Connections',
            'Wine Tasting Experience',
        ];
        const eventTypes: ('dinner' | 'lunch' | 'mixer')[] = ['dinner', 'lunch', 'mixer'];

        for (let i = 0; i < count; i++) {
            const title = `[SANDBOX] ${getRandomItem(eventTitles)}`;
            const type = getRandomItem(eventTypes);
            const daysOffset = Math.floor(Math.random() * daysFromNow);
            const hours = type === 'lunch' ? 14 : type === 'dinner' ? 19 : 18;
            const dateTime = new Date();
            dateTime.setDate(dateTime.getDate() + daysOffset);
            dateTime.setHours(hours, 0, 0, 0);

            const price = type === 'lunch' ? 500 : type === 'dinner' ? 1200 : 800;

            try {
                const event = await this.prisma.event.create({
                    data: {
                        title,
                        eventType: type,
                        startTime: dateTime,
                        price: price.toString(),
                        capacity: 20,
                        isVisible: true,
                        isSandbox: true,
                        description: `Join us for a delightful ${type} experience where you'll meet new people and enjoy great conversation.`,
                    },
                });

                events.push(event);
            } catch (error) {
                console.error(`Failed to create sandbox event ${title}:`, error);
                continue;
            }
        }

        return events;
    }

    // Create sandbox bookings
    async createSandboxBookings(userIds: string[], eventIds: string[]) {
        const bookings = [];

        for (const eventId of eventIds) {
            // Book 30-70% of users for each event
            const bookingPercentage = Math.random() * 0.4 + 0.3;
            const usersToBook = Math.floor(userIds.length * bookingPercentage);
            const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5).slice(0, usersToBook);

            for (const userId of shuffledUsers) {
                try {
                    const event = await this.prisma.event.findUnique({
                        where: { id: eventId },
                    });

                    const booking = await this.prisma.booking.create({
                        data: {
                            userId,
                            eventId,
                            status: 'confirmed',
                            amountPaid: event?.price || 0,
                            paymentStatus: `SANDBOX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        },
                    });

                    bookings.push(booking);
                } catch (error) {
                    console.error(`Failed to create sandbox booking for user ${userId}:`, error);
                    continue;
                }
            }
        }

        return bookings;
    }

    // Reset all sandbox data
    async resetSandboxData() {
        try {
            // Delete sandbox bookings (via events)
            const sandboxEvents = await this.prisma.event.findMany({
                where: { isSandbox: true },
                select: { id: true },
            });
            const sandboxEventIds = sandboxEvents.map(e => e.id);

            if (sandboxEventIds.length > 0) {
                await this.prisma.booking.deleteMany({
                    where: { eventId: { in: sandboxEventIds } },
                });
            }

            // Delete sandbox events
            await this.prisma.event.deleteMany({
                where: { isSandbox: true },
            });

            // Delete sandbox notifications
            await this.prisma.sandboxNotification.deleteMany({});

            // Delete sandbox users (those with sandbox emails)
            await this.prisma.user.deleteMany({
                where: {
                    email: { startsWith: 'sandbox.' },
                },
            });

            // Reset time state
            await this.resetTime();

            return { success: true };
        } catch (error: any) {
            console.error('Failed to reset sandbox data:', error);
            return { success: false, error: error.message };
        }
    }

    // Get sandbox users
    async getSandboxUsers() {
        return this.prisma.user.findMany({
            where: {
                email: { startsWith: 'sandbox.' },
            },
            include: {
                profile: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get sandbox events
    async getSandboxEvents() {
        return this.prisma.event.findMany({
            where: { isSandbox: true },
            include: {
                bookings: true,
            },
            orderBy: { startTime: 'asc' },
        });
    }

    // Get sandbox notifications
    async getSandboxNotifications(limit: number = 50) {
        return this.prisma.sandboxNotification.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
