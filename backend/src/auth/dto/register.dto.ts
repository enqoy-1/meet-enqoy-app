import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsBoolean, IsObject, IsArray } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsObject()
  personality?: any;

  @IsOptional()
  @IsBoolean()
  isLegacyImport?: boolean;

  // New fields for enhanced legacy import
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
  @IsString()
  diet?: string;

  @IsOptional()
  @IsString()
  spending?: string;

  @IsOptional()
  @IsString()
  restaurantFrequency?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  funFacts?: string[];

  @IsOptional()
  @IsString()
  mealPreference?: string;

  @IsOptional()
  @IsString()
  countryId?: string;  // Reference to Country model
}
