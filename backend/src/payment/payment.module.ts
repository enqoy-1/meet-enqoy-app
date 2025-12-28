import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { OcrService } from './ocr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [PrismaModule, EmailModule],
    controllers: [PaymentController],
    providers: [PaymentService, OcrService],
    exports: [PaymentService],
})
export class PaymentModule { }
