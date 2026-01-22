import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
    constructor(private creditsService: CreditsService) { }

    /**
     * Get current user's credits and transaction history
     */
    @Get('my')
    getMyCredits(@CurrentUser() user: any) {
        return this.creditsService.getUserCredits(user.id);
    }

    /**
     * Check if credit can be used for a specific event
     */
    @Get('can-use/:eventId')
    async canUseCredit(
        @CurrentUser() user: any,
        @Param('eventId') eventId: string,
    ) {
        const canUse = await this.creditsService.canUseCreditForEvent(user.id, eventId);
        return { canUse };
    }

    /**
     * Admin: Get all users with credits
     */
    @Get('users-with-credits')
    @UseGuards(RolesGuard)
    @Roles(UserRole.admin, UserRole.super_admin)
    getUsersWithCredits() {
        return this.creditsService.getUsersWithCredits();
    }

    /**
     * Admin: Get a user's credit history
     */
    @Get('user/:userId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.admin, UserRole.super_admin)
    getUserCredits(@Param('userId') userId: string) {
        return this.creditsService.getUserCredits(userId);
    }

    /**
     * Admin: Grant credits to a user
     */
    @Post('grant')
    @UseGuards(RolesGuard)
    @Roles(UserRole.admin, UserRole.super_admin)
    grantCredit(
        @CurrentUser() admin: any,
        @Body() body: { userId: string; amount: number; reason?: string },
    ) {
        return this.creditsService.adminGrantCredit(
            body.userId,
            body.amount,
            admin.id,
            body.reason,
        );
    }

    /**
     * Admin: Revoke credits from a user
     */
    @Post('revoke')
    @UseGuards(RolesGuard)
    @Roles(UserRole.admin, UserRole.super_admin)
    revokeCredit(
        @CurrentUser() admin: any,
        @Body() body: { userId: string; amount: number; reason?: string },
    ) {
        return this.creditsService.adminRevokeCredit(
            body.userId,
            body.amount,
            admin.id,
            body.reason,
        );
    }
}
