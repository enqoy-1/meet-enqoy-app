import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreditTransactionResult {
    success: boolean;
    transaction?: any;
    newBalance: number;
    message?: string;
}

@Injectable()
export class CreditsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get user's current credit balance and transaction history
     */
    async getUserCredits(userId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { eventCredits: true },
        });

        const transactions = await this.prisma.creditTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to recent transactions
            include: {
                sourceBooking: {
                    include: {
                        event: { select: { id: true, title: true, startTime: true } },
                    },
                },
                usedForBooking: {
                    include: {
                        event: { select: { id: true, title: true, startTime: true } },
                    },
                },
            },
        });

        return {
            balance: profile?.eventCredits || 0,
            transactions,
        };
    }

    /**
     * Add credit when user purchases two-events package
     */
    async earnCredit(
        userId: string,
        sourceBookingId: string,
        sourceEventId: string,
        description?: string,
    ): Promise<CreditTransactionResult> {
        // Get current balance
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { eventCredits: true },
        });

        const currentBalance = profile?.eventCredits || 0;
        const newBalance = currentBalance + 1;

        // Update profile and create transaction in a transaction
        const [updatedProfile, transaction] = await this.prisma.$transaction([
            this.prisma.profile.update({
                where: { userId },
                data: { eventCredits: { increment: 1 } },
            }),
            this.prisma.creditTransaction.create({
                data: {
                    userId,
                    type: 'earned',
                    amount: 1,
                    balance: newBalance,
                    sourceBookingId,
                    sourceEventId,
                    description: description || 'Earned from two-events package purchase',
                },
            }),
        ]);

        return {
            success: true,
            transaction,
            newBalance,
            message: 'Credit earned successfully',
        };
    }

    /**
     * Use credit for a new booking
     * Returns the event ID where the credit was earned (for validation)
     */
    async useCredit(
        userId: string,
        forBookingId: string,
        forEventId: string,
        description?: string,
    ): Promise<CreditTransactionResult> {
        // Get current balance
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { eventCredits: true },
        });

        const currentBalance = profile?.eventCredits || 0;

        if (currentBalance < 1) {
            throw new BadRequestException('No credits available');
        }

        // Find the oldest unused credit to track where it came from
        const oldestCredit = await this.prisma.creditTransaction.findFirst({
            where: {
                userId,
                type: 'earned',
                // Find credits that haven't been "consumed" yet
                sourceEventId: { not: null },
            },
            orderBy: { createdAt: 'asc' },
        });

        const newBalance = currentBalance - 1;

        // Update profile and create transaction
        const [updatedProfile, transaction] = await this.prisma.$transaction([
            this.prisma.profile.update({
                where: { userId },
                data: { eventCredits: { decrement: 1 } },
            }),
            this.prisma.creditTransaction.create({
                data: {
                    userId,
                    type: 'used',
                    amount: -1,
                    balance: newBalance,
                    usedForBookingId: forBookingId,
                    usedForEventId: forEventId,
                    sourceEventId: oldestCredit?.sourceEventId, // Track origin
                    description: description || 'Used for event booking',
                },
            }),
        ]);

        return {
            success: true,
            transaction,
            newBalance,
            message: 'Credit used successfully',
        };
    }

    /**
     * Admin: Grant credits to a user
     */
    async adminGrantCredit(
        userId: string,
        amount: number,
        adminId: string,
        reason?: string,
    ): Promise<CreditTransactionResult> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { eventCredits: true },
        });

        const currentBalance = profile?.eventCredits || 0;
        const newBalance = currentBalance + amount;

        const [updatedProfile, transaction] = await this.prisma.$transaction([
            this.prisma.profile.update({
                where: { userId },
                data: { eventCredits: { increment: amount } },
            }),
            this.prisma.creditTransaction.create({
                data: {
                    userId,
                    type: 'admin_grant',
                    amount,
                    balance: newBalance,
                    description: reason || `Admin granted ${amount} credit(s)`,
                },
            }),
        ]);

        return {
            success: true,
            transaction,
            newBalance,
            message: `Granted ${amount} credit(s) to user`,
        };
    }

    /**
     * Admin: Revoke credits from a user
     */
    async adminRevokeCredit(
        userId: string,
        amount: number,
        adminId: string,
        reason?: string,
    ): Promise<CreditTransactionResult> {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { eventCredits: true },
        });

        const currentBalance = profile?.eventCredits || 0;

        if (amount > currentBalance) {
            throw new BadRequestException(
                `User only has ${currentBalance} credits. Cannot revoke ${amount}.`,
            );
        }

        const newBalance = currentBalance - amount;

        const [updatedProfile, transaction] = await this.prisma.$transaction([
            this.prisma.profile.update({
                where: { userId },
                data: { eventCredits: { decrement: amount } },
            }),
            this.prisma.creditTransaction.create({
                data: {
                    userId,
                    type: 'admin_revoke',
                    amount: -amount,
                    balance: newBalance,
                    description: reason || `Admin revoked ${amount} credit(s)`,
                },
            }),
        ]);

        return {
            success: true,
            transaction,
            newBalance,
            message: `Revoked ${amount} credit(s) from user`,
        };
    }

    /**
     * Check if credit can be used for a specific event
     * (Cannot use credit earned from same event)
     */
    async canUseCreditForEvent(userId: string, targetEventId: string): Promise<boolean> {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            select: { eventCredits: true },
        });

        if (!profile || profile.eventCredits < 1) {
            return false;
        }

        // Check if all credits came from the same event (edge case)
        const earnedCredits = await this.prisma.creditTransaction.findMany({
            where: {
                userId,
                type: 'earned',
            },
            select: { sourceEventId: true },
        });

        const usedCredits = await this.prisma.creditTransaction.count({
            where: {
                userId,
                type: 'used',
            },
        });

        // Calculate available credits by source
        const availableCredits = earnedCredits.length - usedCredits;

        if (availableCredits < 1) {
            return false;
        }

        // Find if there's at least one credit NOT from the target event
        const creditsNotFromTargetEvent = earnedCredits.filter(
            (c) => c.sourceEventId !== targetEventId,
        );

        // If all credits are from target event, can't use them
        if (creditsNotFromTargetEvent.length === 0 && earnedCredits.some(c => c.sourceEventId === targetEventId)) {
            return false;
        }

        return true;
    }

    /**
     * Get all users with credits (admin view)
     */
    async getUsersWithCredits() {
        const users = await this.prisma.user.findMany({
            where: {
                profile: {
                    eventCredits: { gt: 0 },
                },
            },
            include: {
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        eventCredits: true,
                    },
                },
            },
            orderBy: {
                profile: {
                    eventCredits: 'desc',
                },
            },
        });

        return users.map((u) => ({
            id: u.id,
            email: u.email,
            name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.email,
            credits: u.profile?.eventCredits || 0,
        }));
    }
}
