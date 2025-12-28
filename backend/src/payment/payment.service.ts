import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OcrService } from './ocr.service';
import { SubmitPaymentDto, PaymentMethod } from './dto/payment.dto';
import { format } from 'date-fns';

@Injectable()
export class PaymentService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private ocrService: OcrService,
    ) { }

    // Payment account info from environment
    private getPaymentAccounts() {
        return {
            telebirr: {
                number: process.env.TELEBIRR_ACCOUNT || '0945202986',
                name: process.env.TELEBIRR_ACCOUNT_NAME || 'Rediat Fufa Legissa',
            },
            cbe: {
                number: process.env.CBE_ACCOUNT || '1000340187807',
                name: process.env.CBE_ACCOUNT_NAME || 'Rediat Fufa Legissa',
            },
        };
    }

    async getPaymentInfo() {
        return this.getPaymentAccounts();
    }

    async submitPayment(userId: string, dto: SubmitPaymentDto) {
        // Check booking exists and belongs to user
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: { payment: true },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.userId !== userId) {
            throw new NotFoundException('Booking not found');
        }

        // Check if payment already exists
        if (booking.payment) {
            throw new ConflictException('Payment already submitted for this booking');
        }

        // Validate: must have either transactionId or screenshot
        if (!dto.transactionId && !dto.screenshotUrl) {
            throw new BadRequestException(
                'Please provide either a transaction ID or upload a screenshot',
            );
        }

        // Try to verify automatically
        let status = 'pending';
        let verifiedAt = null;
        let verificationReason: string | undefined;

        // OPTION 1: Try OCR verification if screenshot is provided
        if (dto.screenshotUrl && !dto.transactionId) {
            console.log('📸 Screenshot provided, attempting OCR verification...');

            try {
                // Decode base64 screenshot
                const base64Data = dto.screenshotUrl.replace(/^data:image\/\w+;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');

                console.log('📷 Decoded screenshot, size:', imageBuffer.length, 'bytes');

                // Extract text using OCR
                const ocrText = await this.ocrService.extractTextFromImage(imageBuffer);

                // Parse receipt data
                const extractedData = this.ocrService.parseTelebirrReceipt(ocrText);

                // Get expected payment details
                const accounts = this.getPaymentAccounts();
                const expectedReceiver = dto.paymentMethod === PaymentMethod.TELEBIRR
                    ? accounts.telebirr.number
                    : accounts.cbe.number;
                const expectedReceiverName = dto.paymentMethod === PaymentMethod.TELEBIRR
                    ? accounts.telebirr.name
                    : accounts.cbe.name;

                // Verify extracted data
                const verificationResult = this.ocrService.verifyReceiptData(
                    extractedData,
                    {
                        amount: dto.amount,
                        receiverAccount: expectedReceiver,
                        receiverName: expectedReceiverName,
                    }
                );

                if (verificationResult.verified) {
                    status = 'verified';
                    verifiedAt = new Date();
                    console.log('✅ Screenshot OCR verification successful!');
                } else {
                    verificationReason = verificationResult.reason;
                    console.log('❌ Screenshot OCR verification failed:', verificationReason);
                }

                // Store extracted transaction number if found
                if (extractedData.transactionNumber && !dto.transactionId) {
                    dto.transactionId = extractedData.transactionNumber;
                    console.log('📝 Extracted transaction number from screenshot:', dto.transactionId);
                }
            } catch (error) {
                console.error('OCR verification error:', error);
                verificationReason = 'Could not read screenshot. Please ensure image is clear or try entering transaction ID manually.';
            }
        }

        // OPTION 2: Try transaction ID verification
        if (dto.transactionId && status !== 'verified') {
            const result = await this.verifyTransactionId(
                dto.paymentMethod,
                dto.transactionId,
                dto.amount,
            );

            if (result.verified) {
                status = 'verified';
                verifiedAt = new Date();
            } else {
                verificationReason = result.reason;
            }
        }

        // Create payment record
        const payment = await this.prisma.payment.create({
            data: {
                bookingId: dto.bookingId,
                amount: dto.amount.toString(),
                paymentMethod: dto.paymentMethod,
                transactionId: dto.transactionId,
                screenshotUrl: dto.screenshotUrl,
                status,
                verifiedAt,
            },
        });

        // If auto-verified, update booking status and send email
        if (status === 'verified') {
            const updatedBooking = await this.prisma.booking.update({
                where: { id: dto.bookingId },
                data: {
                    status: 'confirmed',
                    paymentStatus: 'paid',
                },
                include: {
                    user: {
                        select: {
                            email: true,
                            profile: true,
                        },
                    },
                    event: true,
                },
            });

            // Send payment verification email
            if (updatedBooking.user?.email) {
                const userName = updatedBooking.user.profile?.firstName ||
                                updatedBooking.user.email.split('@')[0];

                await this.emailService.sendPaymentVerified({
                    to: updatedBooking.user.email,
                    userName,
                    eventTitle: updatedBooking.event.title,
                    eventDate: format(new Date(updatedBooking.event.startTime), "PPPP 'at' p"),
                    amount: dto.amount,
                    autoVerified: true,
                });
            }
        }

        let message = status === 'verified'
            ? 'Payment verified successfully! Check your email for confirmation.'
            : 'Payment submitted for review. You will be notified by email once verified.';

        if (status !== 'verified' && verificationReason) {
            message = `Verification failed: ${verificationReason}. Payment submitted for manual review.`;
        }

        return {
            payment,
            autoVerified: status === 'verified',
            message,
        };
    }

    private async verifyTransactionId(
        method: PaymentMethod,
        transactionId: string,
        amount: number,
    ): Promise<{ verified: boolean; reason?: string }> {
        try {
            if (method === PaymentMethod.TELEBIRR) {
                return await this.verifyTelebirrReceipt(transactionId, amount);
            } else if (method === PaymentMethod.CBE) {
                // CBE payments require manual verification by admin
                console.log('CBE payment submitted for manual review:', transactionId);
                return {
                    verified: false,
                    reason: 'CBE payments require manual verification. An admin will review your payment within 24 hours.'
                };
            }
            return { verified: false, reason: 'Unsupported payment method' };
        } catch (error) {
            console.error('Transaction verification error:', error);
            return { verified: false, reason: 'Verification system temporarily unavailable. Your payment will be reviewed manually.' };
        }
    }

    private async verifyTelebirrReceipt(
        receiptNo: string,
        expectedAmount: number,
    ): Promise<{ verified: boolean; reason?: string }> {
        try {
            console.log('🔍 Starting TeleBirr verification for receipt:', receiptNo);

            // Try multiple TeleBirr receipt verification URLs
            const urls = [
                `https://transactioninfo.ethiotelecom.et/receipt/${receiptNo}`,
                `https://telebirr.et/receipt/${receiptNo}`,
                `https://api.ethiotelecom.et/receipt/${receiptNo}`,
            ];

            let lastError: any = null;

            for (const url of urls) {
                try {
                    console.log(`Trying TeleBirr URL: ${url}`);

                    // Fetch with timeout (20 seconds for better reliability)
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 20000);

                    let response: Response;
                    try {
                        response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Connection': 'keep-alive',
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache',
                            },
                            signal: controller.signal,
                        });
                    } catch (fetchError: any) {
                        clearTimeout(timeoutId);
                        if (fetchError.name === 'AbortError') {
                            console.log(`⏱️ Timeout for ${url}`);
                            lastError = new Error('Timeout');
                            continue; // Try next URL
                        }
                        console.log(`❌ Fetch error for ${url}:`, fetchError.message);
                        lastError = fetchError;
                        continue; // Try next URL
                    } finally {
                        clearTimeout(timeoutId);
                    }

                    console.log(`📡 Response status for ${url}:`, response.status);

                    if (!response.ok) {
                        if (response.status === 404) {
                            console.log('404 - Receipt not found at this URL, trying next...');
                            lastError = new Error('404');
                            continue;
                        }
                        console.log('Non-OK response:', response.status, response.statusText);
                        lastError = new Error(`HTTP ${response.status}`);
                        continue;
                    }

                    // Check content type
                    const contentType = response.headers.get('content-type') || '';
                    console.log('📄 Content-Type:', contentType);

                    // If it's a PDF, we can't auto-verify
                    if (contentType.includes('application/pdf') || contentType.includes('pdf')) {
                        console.log('⚠️ Response is a PDF - cannot auto-verify. User should upload screenshot instead.');
                        return {
                            verified: false,
                            reason: 'TeleBirr receipt is a PDF. Please upload a screenshot of your receipt instead for faster verification.'
                        };
                    }

                    // Successfully got a response, now parse it
                    const html = await response.text();
                    console.log('✅ Successfully fetched receipt data, length:', html.length);

                    // Check if response looks like HTML
                    if (!html.includes('<') && !html.includes('{')) {
                        console.log('⚠️ Response does not look like HTML or JSON');
                        lastError = new Error('Invalid format');
                        continue;
                    }

                    // If we got here, we found a working URL - proceed with verification
                    return this.parseAndVerifyTelebirrReceipt(html, receiptNo, expectedAmount);

                } catch (error: any) {
                    console.log(`Error with URL ${url}:`, error.message);
                    lastError = error;
                    continue;
                }
            }

            // All URLs failed
            console.error('❌ All TeleBirr URLs failed. Last error:', lastError?.message);
            return {
                verified: false,
                reason: 'TeleBirr verification service unavailable. Your payment will be reviewed manually within 24 hours.'
            };
        } catch (error: any) {
            console.error('TeleBirr verification error:', error);
            return {
                verified: false,
                reason: 'Verification system error. Your payment will be reviewed manually within 24 hours.'
            };
        }
    }

    private parseAndVerifyTelebirrReceipt(
        html: string,
        receiptNo: string,
        expectedAmount: number,
    ): { verified: boolean; reason?: string } {
        try {
            // Check if receipt exists (look for common error patterns)
            if (html.includes('not found') || html.includes('Invalid') || html.includes('No transaction')) {
                console.log('TeleBirr receipt invalid or not found:', receiptNo);
                return { verified: false, reason: 'Invalid receipt number. Please check and try again.' };
            }

            // Parse the HTML to extract transaction details
            // Look for amount in the receipt - try multiple patterns
            const amountPatterns = [
                /Amount[:\s]*(?:ETB\s*)?([\d,]+(?:\.\d{2})?)/i,
                /Total[:\s]*(?:ETB\s*)?([\d,]+(?:\.\d{2})?)/i,
                /(?:ETB|Birr)[:\s]*([\d,]+(?:\.\d{2})?)/i,
                /([\d,]+(?:\.\d{2})?)\s*(?:ETB|Birr)/i,
            ];

            let amountMatch = null;
            for (const pattern of amountPatterns) {
                amountMatch = html.match(pattern);
                if (amountMatch) {
                    console.log('Found amount with pattern:', pattern);
                    break;
                }
            }

            if (!amountMatch) {
                console.log('Could not parse amount from TeleBirr receipt');
                console.log('HTML preview:', html.substring(0, 500));
                return {
                    verified: false,
                    reason: 'Could not verify receipt details. Your payment will be reviewed manually.'
                };
            }

            // Remove commas and parse amount
            const receiptAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
            console.log('Parsed amount from receipt:', receiptAmount);

            // Get our expected account number
            const accounts = this.getPaymentAccounts();
            const ourAccount = accounts.telebirr.number;
            console.log('Expected receiver account:', ourAccount);

            // Look for receiver/to account in receipt - try multiple patterns
            const receiverPatterns = [
                /(?:To|Receiver|Recipient|Sent to)[:\s]*(09\d{8}|07\d{8}|\+2519\d{8})/i,
                /(?:Account|Number)[:\s]*(09\d{8}|07\d{8}|\+2519\d{8})/i,
                /(09\d{8}|07\d{8}|\+2519\d{8})/,
            ];

            let receiverMatch = null;
            for (const pattern of receiverPatterns) {
                receiverMatch = html.match(pattern);
                if (receiverMatch) {
                    console.log('Found receiver with pattern:', pattern);
                    break;
                }
            }

            if (receiverMatch) {
                const receiverAccount = receiverMatch[1];
                console.log('Found receiver account in receipt:', receiverAccount);

                // Normalize: remove leading 0 or +251 if present and compare
                const normalizedReceiver = receiverAccount.replace(/^(\+251|0)/, '');
                const normalizedOurs = ourAccount.replace(/^(\+251|0)/, '');

                console.log('Normalized receiver:', normalizedReceiver, 'Normalized ours:', normalizedOurs);

                if (normalizedReceiver !== normalizedOurs) {
                    console.log(`❌ Receiver mismatch: expected ${ourAccount}, got ${receiverAccount}`);
                    return {
                        verified: false,
                        reason: `Payment sent to wrong account (${receiverAccount}). Please send to ${ourAccount}.`
                    };
                }
                console.log('✅ Receiver account verified:', receiverAccount);
            } else {
                // If we can't verify receiver, check if our account appears anywhere in receipt
                console.log('Could not find explicit receiver, checking if our account appears in HTML...');
                const normalizedOurs = ourAccount.replace(/^(\+251|0)/, '');
                if (!html.includes(ourAccount) && !html.includes(normalizedOurs)) {
                    console.log('❌ Our account not found in receipt - cannot verify receiver');
                    return {
                        verified: false,
                        reason: `Could not verify receiver account. Please ensure payment was sent to ${ourAccount}.`
                    };
                }
                console.log('✅ Found our account number somewhere in receipt');
            }

            // Verify amount matches (allow small difference for fees, max 5 ETB)
            const amountDifference = Math.abs(receiptAmount - expectedAmount);
            console.log('Amount difference:', amountDifference, 'ETB');

            if (amountDifference > 5) {
                console.log(`❌ Amount mismatch: expected ${expectedAmount}, got ${receiptAmount}`);
                return {
                    verified: false,
                    reason: `Amount mismatch. Expected ${expectedAmount} ETB, but received ${receiptAmount} ETB.`
                };
            }

            console.log('✅✅✅ TeleBirr receipt verified successfully!');
            console.log('Receipt:', receiptNo, '| Amount:', receiptAmount, 'ETB | Expected:', expectedAmount, 'ETB');
            return { verified: true };

        } catch (error: any) {
            console.error('Error parsing TeleBirr receipt:', error);
            return {
                verified: false,
                reason: 'Error parsing receipt. Your payment will be reviewed manually.'
            };
        }
    }

    async getPaymentByBooking(bookingId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { bookingId },
            include: {
                booking: {
                    include: {
                        event: true,
                        user: {
                            select: { id: true, email: true, profile: true },
                        },
                    },
                },
            },
        });

        return payment;
    }

    async getPendingPayments() {
        return this.prisma.payment.findMany({
            where: { status: 'pending' },
            include: {
                booking: {
                    include: {
                        event: true,
                        user: {
                            select: { id: true, email: true, profile: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async adminApprove(paymentId: string, adminUserId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: {
                    include: {
                        user: {
                            select: {
                                email: true,
                                profile: true,
                            },
                        },
                        event: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'pending') {
            throw new BadRequestException('Payment has already been reviewed');
        }

        // Update payment
        const updatedPayment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'verified',
                verifiedAt: new Date(),
                verifiedBy: adminUserId,
            },
        });

        // Confirm booking
        await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
                status: 'confirmed',
                paymentStatus: 'paid',
            },
        });

        // Send payment verification email
        if (payment.booking.user?.email) {
            const userName = payment.booking.user.profile?.firstName ||
                            payment.booking.user.email.split('@')[0];

            await this.emailService.sendPaymentVerified({
                to: payment.booking.user.email,
                userName,
                eventTitle: payment.booking.event.title,
                eventDate: format(new Date(payment.booking.event.startTime), "PPPP 'at' p"),
                amount: parseFloat(payment.amount.toString()),
                autoVerified: false,
            });
        }

        return updatedPayment;
    }

    async adminReject(paymentId: string, adminUserId: string, reason?: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: {
                    include: {
                        user: {
                            select: {
                                email: true,
                                profile: true,
                            },
                        },
                        event: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'pending') {
            throw new BadRequestException('Payment has already been reviewed');
        }

        // Update payment
        const updatedPayment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'rejected',
                verifiedAt: new Date(),
                verifiedBy: adminUserId,
                rejectionReason: reason,
            },
        });

        // Update booking payment status
        await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
                paymentStatus: 'rejected',
            },
        });

        // Send payment rejection email
        if (payment.booking.user?.email) {
            const userName = payment.booking.user.profile?.firstName ||
                            payment.booking.user.email.split('@')[0];

            await this.emailService.sendPaymentRejected({
                to: payment.booking.user.email,
                userName,
                eventTitle: payment.booking.event.title,
                amount: parseFloat(payment.amount.toString()),
                reason,
            });
        }

        return updatedPayment;
    }
}
