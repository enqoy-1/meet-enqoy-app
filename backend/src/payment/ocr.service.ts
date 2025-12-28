import { Injectable } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface ExtractedReceiptData {
    transactionNumber?: string;
    amount?: number;
    receiver?: string;
    transactionDate?: string;
    rawText: string;
}

@Injectable()
export class OcrService {
    /**
     * Extract text from image using Tesseract OCR
     */
    async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
        try {
            console.log('🔍 Starting OCR on image, size:', imageBuffer.length, 'bytes');

            // Optimize image for better OCR accuracy
            const processedImage = await sharp(imageBuffer)
                .resize(2000, null, { // Resize to max width 2000px for better OCR
                    withoutEnlargement: true,
                    fit: 'inside',
                })
                .greyscale() // Convert to grayscale
                .normalize() // Improve contrast
                .sharpen() // Sharpen text
                .toBuffer();

            console.log('📸 Image preprocessed for OCR');

            // Perform OCR
            const { data } = await Tesseract.recognize(processedImage, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });

            console.log('✅ OCR completed, extracted', data.text.length, 'characters');
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
        console.log('📄 Parsing TeleBirr receipt from OCR text...');
        console.log('Raw OCR text preview:', ocrText.substring(0, 500));

        const result: ExtractedReceiptData = {
            rawText: ocrText,
        };

        // Extract Transaction Number
        // Pattern: "Transaction Number:" followed by alphanumeric code
        const transactionNumberPatterns = [
            /Transaction\s*Number\s*[:\-]?\s*([A-Z0-9]{8,15})/i,
            /Receipt\s*(?:No|Number)\s*[:\-]?\s*([A-Z0-9]{8,15})/i,
            /Reference\s*[:\-]?\s*([A-Z0-9]{8,15})/i,
            /Transaction\s*ID\s*[:\-]?\s*([A-Z0-9]{8,15})/i,
        ];

        for (const pattern of transactionNumberPatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                result.transactionNumber = match[1].trim();
                console.log('✓ Found transaction number:', result.transactionNumber);
                break;
            }
        }

        // Extract Amount
        // Pattern: amount followed by ETB/Birr
        const amountPatterns = [
            /[-]?\s*(\d+(?:\.\d{2})?)\s*(?:ETB|Birr)/i,
            /Amount\s*[:\-]?\s*(?:ETB\s*)?(\d+(?:\.\d{2})?)/i,
            /Total\s*[:\-]?\s*(?:ETB\s*)?(\d+(?:\.\d{2})?)/i,
            /(\d+\.\d{2})\s*\(ETB\)/i,
        ];

        for (const pattern of amountPatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                const amountStr = match[1].replace(/,/g, '');
                result.amount = Math.abs(parseFloat(amountStr)); // Use absolute value
                console.log('✓ Found amount:', result.amount, 'ETB');
                break;
            }
        }

        // Extract Receiver
        // Pattern: "Transaction To:", "Sent to:", "Receiver:", etc.
        const receiverPatterns = [
            /Transaction\s*To\s*[:\-]?\s*([^\n\r]{2,50})/i,
            /Sent\s*to\s*[:\-]?\s*([^\n\r]{2,50})/i,
            /Receiver\s*[:\-]?\s*([^\n\r]{2,50})/i,
            /To\s*[:\-]?\s*([^\n\r]{2,50})/i,
            /Recipient\s*[:\-]?\s*([^\n\r]{2,50})/i,
        ];

        for (const pattern of receiverPatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                result.receiver = match[1].trim();
                console.log('✓ Found receiver:', result.receiver);
                break;
            }
        }

        // Extract Transaction Date/Time
        // Pattern: various date formats
        const datePatterns = [
            /Transaction\s*(?:Time|Date)\s*[:\-]?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
            /Date\s*[:\-]?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
            /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2})/,
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i,
        ];

        for (const pattern of datePatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                result.transactionDate = match[1].trim();
                console.log('✓ Found transaction date:', result.transactionDate);
                break;
            }
        }

        console.log('📊 Extracted data summary:', {
            hasTransactionNumber: !!result.transactionNumber,
            hasAmount: !!result.amount,
            hasReceiver: !!result.receiver,
            hasDate: !!result.transactionDate,
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
            receiver: extracted.receiver,
        });

        const matchDetails = {
            amountMatch: false,
            receiverMatch: false,
        };

        // Verify amount (allow small difference up to 5 ETB for fees)
        if (extracted.amount) {
            const amountDifference = Math.abs(extracted.amount - expected.amount);
            matchDetails.amountMatch = amountDifference <= 5;
            console.log(`Amount: Expected ${expected.amount} ETB, Got ${extracted.amount} ETB, Difference: ${amountDifference} ETB`);
        } else {
            console.log('❌ Amount not found in receipt');
            return {
                verified: false,
                reason: 'Could not extract amount from receipt. Please ensure the screenshot is clear.',
                matchDetails,
            };
        }

        // Verify receiver (check if expected account/name appears in extracted receiver text)
        if (extracted.receiver) {
            const receiverText = extracted.receiver.toLowerCase();
            const accountMatch = receiverText.includes(expected.receiverAccount.toLowerCase()) ||
                receiverText.includes(expected.receiverAccount.replace(/^0/, '')); // Try without leading 0

            const nameMatch = expected.receiverName ?
                receiverText.includes(expected.receiverName.toLowerCase()) : false;

            matchDetails.receiverMatch = accountMatch || nameMatch;

            console.log(`Receiver: Expected "${expected.receiverAccount}" or "${expected.receiverName}", Got "${extracted.receiver}"`);
            console.log(`Account match: ${accountMatch}, Name match: ${nameMatch}`);
        } else {
            console.log('⚠️ Receiver not found in receipt (not critical)');
        }

        // Determine verification result
        if (!matchDetails.amountMatch) {
            return {
                verified: false,
                reason: `Amount mismatch. Expected ${expected.amount} ETB but receipt shows ${extracted.amount} ETB.`,
                matchDetails,
            };
        }

        // Amount matches - this is the most critical check
        // Receiver verification is secondary (some receipts might not show full account details)
        if (!matchDetails.receiverMatch && extracted.receiver) {
            console.log('⚠️ Receiver verification failed, but amount matches. Marking as needs review.');
            return {
                verified: false,
                reason: `Could not verify receiver account in receipt. Expected payment to ${expected.receiverAccount}, but receipt shows "${extracted.receiver}". Please review manually.`,
                matchDetails,
            };
        }

        console.log('✅ Receipt verified successfully!');
        return {
            verified: true,
            matchDetails,
        };
    }
}
