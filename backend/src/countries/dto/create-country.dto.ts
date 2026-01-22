import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  phoneCode?: string;

  @IsOptional()
  @IsString()
  mainCity?: string;
}
