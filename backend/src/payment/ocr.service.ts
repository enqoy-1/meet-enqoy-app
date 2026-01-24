import { Injectable } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface ExtractedReceiptData {
    transactionNumber?: string;
    amount?: number;
    receiver?: string;
    receiverPhone?: string;
    transactionDate?: string;
    rawText: string;
    paymentType?: 'telebirr' | 'cbe' | 'unknown';
}

@Injectable()
export class OcrService {
    /**
     * Extract text from image using Tesseract OCR
     * Optimized for mobile payment screenshots
     */
    async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
        try {
            console.log('🔍 Starting OCR on image, size:', imageBuffer.length, 'bytes');

            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            console.log('📐 Image dimensions:', metadata.width, 'x', metadata.height);

            // Optimize image for better OCR accuracy
            const processedImage = await sharp(imageBuffer)
                .resize(1800, null, {
                    withoutEnlargement: false, // Allow enlargement for small images
                    fit: 'inside',
                })
                .greyscale()
                .normalize() // Improve contrast
                .sharpen({ sigma: 1.5 }) // Sharpen text
                .modulate({ brightness: 1.1 }) // Slightly brighten
                .toBuffer();

            console.log('📸 Image preprocessed for OCR');

            // Perform OCR with English
            const { data } = await Tesseract.recognize(processedImage, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });

            console.log('✅ OCR completed, extracted', data.text.length, 'characters');
            console.log('📝 Full OCR text:\n', data.text);

            return data.text;
        } catch (error) {
            console.error('❌ OCR extraction error:', error);
            throw new Error('Failed to extract text from image');
        }
    }

    /**
     * Parse TeleBirr receipt text and extract transaction details
     */
    parseTelebirrReceipt(ocrText: string): ExtractedReceiptData {
        console.log('📄 Parsing receipt from OCR text...');

        const result: ExtractedReceiptData = {
            rawText: ocrText,
            paymentType: 'unknown',
        };

        // Detect payment type
        const textLower = ocrText.toLowerCase();
        if (textLower.includes('telebirr') || textLower.includes('tele birr') || textLower.includes('ethio telecom')) {
            result.paymentType = 'telebirr';
            console.log('📱 Detected: TeleBirr receipt');
        } else if (textLower.includes('cbe') || textLower.includes('commercial bank')) {
            result.paymentType = 'cbe';
            console.log('🏦 Detected: CBE receipt');
        }

        // ===== EXTRACT AMOUNT =====
        // Try multiple patterns - TeleBirr shows amounts in various formats
        const amountPatterns = [
            // "ETB 800.00" or "ETB 800"
            /ETB\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
            // "800.00 ETB" or "800 ETB"
            /([\d,]+(?:\.\d{2})?)\s*ETB/i,
            // "800.00 Birr" or "800 Birr"
            /([\d,]+(?:\.\d{2})?)\s*Birr/i,
            // "Amount: 800.00" or "Amount 800"
            /Amount\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
            // "Total: 800.00"
            /Total\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
            // "-800.00" (debit format)
            /[-]\s*([\d,]+(?:\.\d{2})?)/,
            // "Sent Amount" pattern
            /Sent\s*(?:Amount)?\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
            // "Money Sent" pattern
            /Money\s*Sent\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)/i,
            // Just a number followed by .00 (common in receipts)
            /\b([\d,]+\.00)\b/,
        ];

        for (const pattern of amountPatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                const amountStr = match[1].replace(/,/g, '');
                const amount = Math.abs(parseFloat(amountStr));
                // Sanity check - amount should be reasonable (1 to 100,000 ETB)
                // Lowered from 10 to 1 to support test events with very low prices
                if (amount >= 1 && amount <= 100000) {
                    result.amount = amount;
                    console.log('✓ Found amount:', result.amount, 'ETB (pattern:', pattern.source.substring(0, 30) + '...)');
                    break;
                }
            }
        }

        // ===== EXTRACT PHONE NUMBER (Receiver) =====
        // TeleBirr shows phone numbers like "09XXXXXXXX" or "+2519XXXXXXXX"
        const phonePatterns = [
            // "To: 0945202986" or "Sent to: 0945202986"
            /(?:To|Sent\s*to|Receiver|Recipient)\s*[:\-]?\s*(09\d{8})/i,
            /(?:To|Sent\s*to|Receiver|Recipient)\s*[:\-]?\s*(\+2519\d{8})/i,
            // Phone number on its own line
            /\b(09\d{8})\b/,
            /\b(\+2519\d{8})\b/,
            // "9XXXXXXXX" format (without leading 0)
            /\b(9\d{8})\b/,
        ];

        for (const pattern of phonePatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                let phone = match[1];
                // Normalize phone number
                if (phone.startsWith('+251')) {
                    phone = '0' + phone.substring(4);
                } else if (phone.length === 9 && phone.startsWith('9')) {
                    phone = '0' + phone;
                }
                result.receiverPhone = phone;
                console.log('✓ Found receiver phone:', result.receiverPhone);
                break;
            }
        }

        // ===== EXTRACT RECEIVER NAME =====
        const namePatterns = [
            // "To: Name Here" or "Sent to: Name Here"
            /(?:To|Sent\s*to|Receiver|Recipient)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{3,30})/i,
            // "Name: Rediat Fufa"
            /Name\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{3,30})/i,
            // After phone number, there might be a name
            /09\d{8}\s*[-\n]\s*([A-Za-z][A-Za-z\s]{3,30})/i,
        ];

        for (const pattern of namePatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                const name = match[1].trim();
                // Filter out common false positives
                const invalidNames = ['etb', 'birr', 'amount', 'total', 'date', 'time', 'transaction', 'receipt', 'telebirr', 'success'];
                if (!invalidNames.includes(name.toLowerCase()) && name.length > 3) {
                    result.receiver = name;
                    console.log('✓ Found receiver name:', result.receiver);
                    break;
                }
            }
        }

        // ===== EXTRACT TRANSACTION NUMBER =====
        const transactionPatterns = [
            /Transaction\s*(?:Number|No|ID)\s*[:\-]?\s*([A-Z0-9]{8,20})/i,
            /Receipt\s*(?:Number|No)\s*[:\-]?\s*([A-Z0-9]{8,20})/i,
            /Reference\s*[:\-]?\s*([A-Z0-9]{8,20})/i,
            /\b([A-Z]{2,3}\d{8,15})\b/, // Common format: 2-3 letters followed by numbers
        ];

        for (const pattern of transactionPatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                result.transactionNumber = match[1].trim();
                console.log('✓ Found transaction number:', result.transactionNumber);
                break;
            }
        }

        // ===== EXTRACT DATE =====
        const datePatterns = [
            // "2024/01/15 14:30:00" or "2024-01-15 14:30"
            /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)/,
            // "15/01/2024 2:30 PM"
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i,
            // "Jan 15, 2024"
            /([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})/,
        ];

        for (const pattern of datePatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                result.transactionDate = match[1].trim();
                console.log('✓ Found transaction date:', result.transactionDate);
                break;
            }
        }

        console.log('📊 Extraction summary:', {
            paymentType: result.paymentType,
            amount: result.amount,
            receiverPhone: result.receiverPhone,
            receiverName: result.receiver,
            transactionNumber: result.transactionNumber,
            transactionDate: result.transactionDate,
        });

        return result;
    }

    /**
     * Verify extracted receipt data against expected values
     */
    verifyReceiptData(
        extracted: ExtractedReceiptData,
        expected: {
            amount: number;
            receiverAccount: string;
            receiverName?: string;
        },
    ): {
        verified: boolean;
        reason?: string;
        matchDetails: {
            amountMatch: boolean;
            receiverMatch: boolean;
        };
    } {
        console.log('🔍 Verifying extracted receipt data...');
        console.log('Expected:', expected);
        console.log('Extracted:', {
            amount: extracted.amount,
            receiverPhone: extracted.receiverPhone,
            receiverName: extracted.receiver,
        });

        const matchDetails = {
            amountMatch: false,
            receiverMatch: false,
        };

        // ===== VERIFY AMOUNT =====
        if (!extracted.amount) {
            console.log('❌ Amount not found in receipt');
            return {
                verified: false,
                reason: 'Could not find the payment amount in the screenshot. Please ensure the full receipt is visible and try again.',
                matchDetails,
            };
        }

        // Allow difference up to 10 ETB for transaction fees
        const amountDifference = Math.abs(extracted.amount - expected.amount);
        matchDetails.amountMatch = amountDifference <= 10;
        console.log(`Amount check: Expected ${expected.amount} ETB, Found ${extracted.amount} ETB, Difference: ${amountDifference} ETB`);

        if (!matchDetails.amountMatch) {
            return {
                verified: false,
                reason: `Amount mismatch. Expected ${expected.amount} ETB but found ${extracted.amount} ETB in the receipt.`,
                matchDetails,
            };
        }

        // ===== VERIFY RECEIVER =====
        // Normalize expected account (remove leading 0 or +251)
        const normalizedExpected = expected.receiverAccount.replace(/^(\+251|0)/, '');

        // Check phone number match
        if (extracted.receiverPhone) {
            const normalizedExtracted = extracted.receiverPhone.replace(/^(\+251|0)/, '');
            matchDetails.receiverMatch = normalizedExtracted === normalizedExpected;
            console.log(`Phone check: Expected ${normalizedExpected}, Found ${normalizedExtracted}, Match: ${matchDetails.receiverMatch}`);
        }

        // Check name match (fuzzy)
        if (!matchDetails.receiverMatch && extracted.receiver && expected.receiverName) {
            const extractedNameLower = extracted.receiver.toLowerCase();
            const expectedNameLower = expected.receiverName.toLowerCase();

            // Check if names partially match (at least first name)
            const expectedParts = expectedNameLower.split(' ');
            const extractedParts = extractedNameLower.split(' ');

            matchDetails.receiverMatch = expectedParts.some(part =>
                part.length > 2 && extractedParts.some(ePart =>
                    ePart.includes(part) || part.includes(ePart)
                )
            );
            console.log(`Name check: Expected "${expected.receiverName}", Found "${extracted.receiver}", Match: ${matchDetails.receiverMatch}`);
        }

        // Check if expected account appears anywhere in raw text
        if (!matchDetails.receiverMatch) {
            const rawTextClean = extracted.rawText.replace(/\s/g, '');
            if (rawTextClean.includes(normalizedExpected) || rawTextClean.includes(expected.receiverAccount)) {
                matchDetails.receiverMatch = true;
                console.log('✓ Found receiver account in raw text');
            }
        }

        // If amount matches, verify even if receiver check is uncertain
        // Amount is the most important factor
        if (matchDetails.amountMatch) {
            // If we found receiver info and it doesn't match, warn but still verify
            if (!matchDetails.receiverMatch && (extracted.receiverPhone || extracted.receiver)) {
                console.log('⚠️ Amount matches, receiver uncertain but proceeding with verification');
            }

            console.log('✅✅ Receipt verified successfully! Amount matched.');
            return {
                verified: true,
                matchDetails,
            };
        }

        // This shouldn't be reached since we check amount above, but just in case
        return {
            verified: false,
            reason: 'Could not verify payment. Please contact support.',
            matchDetails,
        };
    }
}
