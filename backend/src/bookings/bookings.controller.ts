import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UserRole } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) { }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('eventType') eventType?: string,
    @Query('search') search?: string,
  ) {
    return this.bookingsService.findAllFiltered({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      eventType: eventType || undefined,
      search: search || undefined,
    });
  }

  @Get('my')
  findMyBookings(@CurrentUser() user: any) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Admin can see all bookings, users can only see their own
    const userId = user.roles.some(
      (r: any) => r.role === 'admin' || r.role === 'super_admin',
    )
      ? undefined
      : user.id;
    return this.bookingsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.roles.some(
      (r: any) => r.role === 'admin' || r.role === 'super_admin',
    )
      ? undefined
      : user.id;
    return this.bookingsService.update(id, dto, userId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user.roles.some(
      (r: any) => r.role === 'admin' || r.role === 'super_admin',
    )
      ? undefined
      : user.id;
    return this.bookingsService.cancel(id, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  delete(@Param('id') id: string) {
    return this.bookingsService.delete(id);
  }

  // Admin: Confirm a single booking
  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  confirm(@Param('id') id: string) {
    return this.bookingsService.update(id, { status: 'confirmed' as any });
  }

  // Admin: Confirm all pending bookings for an event
  @Post('confirm-event/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  async confirmEventBookings(@Param('eventId') eventId: string) {
    return this.bookingsService.confirmAllForEvent(eventId);
  }
}
