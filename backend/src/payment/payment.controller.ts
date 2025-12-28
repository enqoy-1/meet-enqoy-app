import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { SubmitPaymentDto, AdminReviewPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    // Get payment account info (no auth needed for display)
    @Get('info')
    async getPaymentInfo() {
        return this.paymentService.getPaymentInfo();
    }

    // Submit payment proof
    @Post()
    async submitPayment(@Request() req, @Body() dto: SubmitPaymentDto) {
        return this.paymentService.submitPayment(req.user.id, dto);
    }

    // Get payment status for a booking
    @Get('booking/:bookingId')
    async getPaymentByBooking(@Param('bookingId') bookingId: string) {
        return this.paymentService.getPaymentByBooking(bookingId);
    }

    // Admin: Get all pending payments
    @Get('pending')
    @UseGuards(RolesGuard)
    @Roles('admin', 'super_admin')
    async getPendingPayments() {
        return this.paymentService.getPendingPayments();
    }

    // Admin: Approve payment
    @Patch(':id/approve')
    @UseGuards(RolesGuard)
    @Roles('admin', 'super_admin')
    async approvePayment(@Request() req, @Param('id') id: string) {
        return this.paymentService.adminApprove(id, req.user.id);
    }

    // Admin: Reject payment
    @Patch(':id/reject')
    @UseGuards(RolesGuard)
    @Roles('admin', 'super_admin')
    async rejectPayment(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: AdminReviewPaymentDto,
    ) {
        return this.paymentService.adminReject(id, req.user.id, dto.rejectionReason);
    }
}
