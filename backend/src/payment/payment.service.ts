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
            include: {
                payment: true,
                event: true, // Include event to get actual price
            },
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

        // Validate: must have screenshot
        if (!dto.screenshotUrl) {
            throw new BadRequestException(
                'Please upload a screenshot of your payment receipt',
            );
        }

        // IMPORTANT: Use the actual booking amount from database, not from frontend
        // The booking.amountPaid is set when booking is created and is the authoritative price
        const expectedAmount = booking.amountPaid
            ? Number(booking.amountPaid)
            : Number(booking.event.price);

        console.log('🎫 Booking details:', {
            bookingId: booking.id,
            bookingAmountPaid: booking.amountPaid,
            eventPrice: booking.event.price,
            frontendAmount: dto.amount,
            actualExpectedAmount: expectedAmount,
        });

        // Warn if frontend amount doesn't match database
        if (dto.amount !== expectedAmount) {
            console.log('⚠️ WARNING: Frontend amount differs from database!');
            console.log(`   Frontend sent: ${dto.amount} ETB`);
            console.log(`   Database expects: ${expectedAmount} ETB`);
            console.log('   Using database amount for verification.');
        }

        // Try to verify automatically using OCR
        let status = 'pending';
        let verifiedAt = null;
        let verificationReason: string | undefined;

        console.log('📸 Screenshot provided, attempting OCR verification...');
        console.log('💳 Payment method:', dto.paymentMethod);
        console.log('💰 Expected amount (from database):', expectedAmount, 'ETB');

        try {
            // Decode base64 screenshot
            const base64Data = dto.screenshotUrl.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            console.log('📷 Decoded screenshot, size:', imageBuffer.length, 'bytes');

            // Extract text using OCR
            const ocrText = await this.ocrService.extractTextFromImage(imageBuffer);

            // Parse receipt data (works for both TeleBirr and CBE)
            const extractedData = this.ocrService.parseTelebirrReceipt(ocrText);

            // Get expected payment details based on payment method
            const accounts = this.getPaymentAccounts();
            const expectedReceiver = dto.paymentMethod === PaymentMethod.TELEBIRR
                ? accounts.telebirr.number
                : accounts.cbe.number;
            const expectedReceiverName = dto.paymentMethod === PaymentMethod.TELEBIRR
                ? accounts.telebirr.name
                : accounts.cbe.name;

            console.log('🎯 Expecting payment to:', expectedReceiver, '-', expectedReceiverName);

            console.log('📊 Extracted data from OCR:', {
                amount: extractedData.amount,
                receiverPhone: extractedData.receiverPhone,
                receiver: extractedData.receiver,
                transactionNumber: extractedData.transactionNumber,
                paymentType: extractedData.paymentType,
            });

            // Verify extracted data - USE DATABASE AMOUNT, NOT FRONTEND
            console.log('🔍 Verifying with expected values:', {
                expectedAmount: expectedAmount,  // From database
                expectedReceiver: expectedReceiver,
                expectedReceiverName: expectedReceiverName,
            });

            const verificationResult = this.ocrService.verifyReceiptData(
                extractedData,
                {
                    amount: expectedAmount,  // Use database amount, not dto.amount
                    receiverAccount: expectedReceiver,
                    receiverName: expectedReceiverName,
                }
            );

            console.log('📋 Verification result:', {
                verified: verificationResult.verified,
                reason: verificationResult.reason,
                matchDetails: verificationResult.matchDetails,
            });

            if (verificationResult.verified) {
                // OCR passed - but still keep as pending for admin review
                // Set a flag to indicate OCR pre-validated this payment
                status = 'pending';
                console.log('✅✅ OCR verification passed - submitted for admin approval');
            } else {
                verificationReason = verificationResult.reason;
                console.log('❌ OCR verification failed:', verificationReason);

                // Add extracted info to help user understand what was found
                if (extractedData.amount) {
                    verificationReason += ` (Found amount: ${extractedData.amount} ETB)`;
                }
            }

            // Store extracted transaction number if found
            if (extractedData.transactionNumber) {
                dto.transactionId = extractedData.transactionNumber;
                console.log('📝 Extracted transaction number:', dto.transactionId);

                // Check for duplicate transaction number (fraud prevention)
                const existingPayment = await this.prisma.payment.findFirst({
                    where: {
                        transactionId: dto.transactionId,
                        status: 'verified',
                    },
                });

                if (existingPayment) {
                    console.log('🚨 FRAUD ALERT: Transaction number already used:', dto.transactionId);
                    throw new BadRequestException(
                        `This receipt has already been used for another payment. Transaction ID: ${dto.transactionId}. Please use a different receipt.`
                    );
                }
            }
        } catch (error: any) {
            // Re-throw BadRequestException as-is
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error('OCR verification error:', error);
            throw new BadRequestException(`Could not read the screenshot: ${error.message}. Please upload a clearer image.`);
        }

        // If OCR verification failed with a clear error, return it - don't create pending payment
        if (verificationReason) {
            throw new BadRequestException(verificationReason || 'Payment verification failed. Please try again with a clearer screenshot.');
        }

        // Check for duplicate transaction number one more time (in case it wasn't extracted from OCR but provided)
        if (dto.transactionId) {
            const existingPayment = await this.prisma.payment.findFirst({
                where: {
                    transactionId: dto.transactionId,
                    status: 'verified',
                },
            });

            if (existingPayment) {
                console.log('🚨 FRAUD ALERT: Transaction number already used:', dto.transactionId);
                throw new BadRequestException(
                    `This receipt has already been used. Please use a different payment receipt.`
                );
            }
        }

        // Create payment record as pending - admin will confirm/deny
        const payment = await this.prisma.payment.create({
            data: {
                bookingId: dto.bookingId,
                amount: expectedAmount.toString(), // Use database amount, not frontend
                paymentMethod: dto.paymentMethod,
                transactionId: dto.transactionId,
                screenshotUrl: dto.screenshotUrl,
                status: 'pending', // Always pending - admin will review
                // Note: verifiedAt will be set when admin approves
            },
        });

        // Keep booking as pending - do NOT auto-confirm
        // Admin will confirm the booking when they approve the payment
        console.log('📝 Payment submitted for admin review, booking:', dto.bookingId);

        return {
            payment,
            autoVerified: false, // Never auto-verified - always needs admin
            message: 'Payment submitted! An admin will verify your payment shortly.',
        };
    }

    private async verifyTransactionId(
        method: PaymentMethod,
        transactionId: string,
        amount: number,
    ): Promise<{ verified: boolean; reason?: string }> {
        try {
            // First check if this transaction ID has already been used
            const existingPayment = await this.prisma.payment.findFirst({
                where: {
                    transactionId: transactionId,
                    status: { in: ['verified', 'pending'] },
                },
            });

            if (existingPayment) {
                console.log('❌ Transaction ID already used:', transactionId);
                return {
                    verified: false,
                    reason: `This transaction ID has already been used for another payment. Please use a different receipt.`
                };
            }

            if (method === PaymentMethod.TELEBIRR) {
                // Validate TeleBirr transaction number format
                const formatCheck = this.validateTelebirrFormat(transactionId);
                if (!formatCheck.valid) {
                    return { verified: false, reason: formatCheck.reason };
                }

                // Try to verify via TeleBirr URL
                return await this.verifyTelebirrReceipt(transactionId, amount);
            } else if (method === PaymentMethod.CBE) {
                // Validate CBE transaction format
                const formatCheck = this.validateCBEFormat(transactionId);
                if (!formatCheck.valid) {
                    return { verified: false, reason: formatCheck.reason };
                }

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

    private validateTelebirrFormat(transactionId: string): { valid: boolean; reason?: string } {
        // Clean the input
        const cleaned = transactionId.trim().toUpperCase();

        // TeleBirr receipt numbers are typically:
        // - 10-20 characters long
        // - Alphanumeric (letters and numbers)
        // - Often start with specific prefixes like "BM", "BP", "CT", "ADQ", etc.

        if (cleaned.length < 8) {
            return { valid: false, reason: 'Transaction ID is too short. TeleBirr receipt numbers are at least 8 characters.' };
        }

        if (cleaned.length > 25) {
            return { valid: false, reason: 'Transaction ID is too long. Please check and try again.' };
        }

        // Must be alphanumeric
        if (!/^[A-Z0-9]+$/i.test(cleaned)) {
            return { valid: false, reason: 'Invalid transaction ID format. TeleBirr receipt numbers contain only letters and numbers.' };
        }

        // Common TeleBirr prefixes (can be expanded)
        const validPrefixes = ['BM', 'BP', 'CT', 'ADQ', 'TRX', 'PAY', 'TB', 'ETB'];
        const hasValidPrefix = validPrefixes.some(prefix => cleaned.startsWith(prefix));

        // If no valid prefix, still allow but log warning
        if (!hasValidPrefix) {
            console.log('⚠️ TeleBirr transaction ID has unusual prefix:', cleaned.substring(0, 3));
        }

        return { valid: true };
    }

    private validateCBEFormat(transactionId: string): { valid: boolean; reason?: string } {
        // Clean the input
        const cleaned = transactionId.trim().toUpperCase();

        // CBE transaction IDs are typically:
        // - Start with "FT" followed by numbers
        // - Or other alphanumeric formats

        if (cleaned.length < 8) {
            return { valid: false, reason: 'Transaction ID is too short. CBE transaction IDs are at least 8 characters.' };
        }

        if (cleaned.length > 25) {
            return { valid: false, reason: 'Transaction ID is too long. Please check and try again.' };
        }

        // Must be alphanumeric (allow some special chars like dashes)
        if (!/^[A-Z0-9\-]+$/i.test(cleaned)) {
            return { valid: false, reason: 'Invalid transaction ID format. CBE transaction IDs contain only letters, numbers, and dashes.' };
        }

        return { valid: true };
    }

    private async verifyTelebirrReceipt(
        receiptNo: string,
        expectedAmount: number,
    ): Promise<{ verified: boolean; reason?: string }> {
        try {
            console.log('🔍 Starting TeleBirr verification for receipt:', receiptNo);
            console.log('💰 Expected amount:', expectedAmount, 'ETB');

            // Get our expected account info
            const accounts = this.getPaymentAccounts();
            console.log('📱 Expected receiver:', accounts.telebirr.number, '-', accounts.telebirr.name);

            // Try the official Ethio Telecom receipt verification URL
            const urls = [
                `https://transactioninfo.ethiotelecom.et/receipt/${receiptNo}`,
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

            // URL verification failed - but format was valid and not a duplicate
            // Accept for manual review with a note
            console.log('⚠️ TeleBirr URL verification unavailable. Receipt:', receiptNo);
            console.log('✓ Transaction ID format is valid');
            console.log('✓ Transaction ID is not a duplicate');
            console.log('→ Submitting for manual admin review');

            return {
                verified: false,
                reason: `Transaction ID ${receiptNo} looks valid but couldn't be auto-verified. Submitted for manual review.`
            };
        } catch (error: any) {
            console.error('TeleBirr verification error:', error);
            return {
                verified: false,
                reason: 'Verification system error. Your payment will be reviewed manually.'
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
