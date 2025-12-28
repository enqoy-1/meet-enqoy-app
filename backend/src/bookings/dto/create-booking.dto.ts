import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsString()
  eventId: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  // New fields for booking system
  @IsOptional()
  @IsBoolean()
  twoEvents?: boolean;  // If true, user pays for 2 events (gets 1 credit)

  @IsOptional()
  @IsBoolean()
  useCredit?: boolean;  // If true, use existing event credit

  @IsOptional()
  @IsBoolean()
  bringFriend?: boolean;  // If true, bringing a friend

  @IsOptional()
  @IsString()
  friendName?: string;

  @IsOptional()
  @IsEmail()
  friendEmail?: string;

  @IsOptional()
  @IsString()
  friendPhone?: string;

  @IsOptional()
  @IsBoolean()
  payForFriend?: boolean;  // If true, booker pays for friend; if false, friend pays themselves
}
