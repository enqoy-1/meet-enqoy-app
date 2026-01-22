import { IsString, IsInt, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { GenderType } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsEnum(GenderType)
  gender?: GenderType;

  @IsOptional()
  @IsString()
  relationshipStatus?: string;

  @IsOptional()
  @IsBoolean()
  hasChildren?: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  assessmentCompleted?: boolean;

  @IsOptional()
  @IsString()
  countryId?: string;
}
