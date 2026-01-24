import { IsString, IsEnum, IsInt, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOptionDto {
    @IsString()
    value: string;

    @IsString()
    label: string;

    @IsOptional()
    scores?: Record<string, number>;
}

export class CreateQuestionDto {
    @IsString()
    key: string;

    @IsString()
    label: string;

    @IsString()
    type: string;

    @IsString()
    section: string;

    @IsInt()
    @IsOptional()
    order?: number;

    @IsArray()
    @IsOptional()
    options: QuestionOptionDto[];

    @IsString()
    @IsOptional()
    placeholder?: string;

    @IsString()
    @IsOptional()
    countryId?: string;
}

export class UpdateQuestionDto extends CreateQuestionDto {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
