import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum PaymentMethod {
    TELEBIRR = 'telebirr',
    CBE = 'cbe',
}

export class SubmitPaymentDto {
    @IsString()
    bookingId: string;

    @IsNumber()
    amount: number;

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsString()
    transactionId?: string;

    @IsOptional()
    @IsString()
    screenshotUrl?: string;  // Base64 or URL after upload
}

export class AdminReviewPaymentDto {
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
