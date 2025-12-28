import { IsString, IsEnum, IsDate, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventType)
  eventType: EventType;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  twoEventsDiscountType?: string; // 'percentage' or 'fixed'

  @IsOptional()
  @IsNumber()
  twoEventsDiscountValue?: number; // Discount value (% or ETB)

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsNumber()
  bookingCutoffHours?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @IsOptional()
  @IsString()
  venueId?: string;
}
