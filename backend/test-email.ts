/**
 * Quick Email Test Script
 * Run with: npx ts-node test-email.ts your-email@example.com
 */

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmail() {
    const testEmail = process.argv[2];

    if (!testEmail) {
        console.log('❌ Please provide an email address');
        console.log('Usage: npx ts-node test-email.ts your-email@example.com');
        process.exit(1);
    }

    console.log('📧 Testing Email Configuration...\n');

    // Check environment variables
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromAddress = process.env.SMTP_FROM || 'Enqoy <noreply@enqoy.com>';

    console.log('Configuration:');
    console.log(`  SMTP_HOST:  ${host ? '✅ ' + host : '❌ NOT SET'}`);
    console.log(`  SMTP_PORT:  ${port ? '✅ ' + port : '❌ NOT SET'}`);
    console.log(`  SMTP_USER:  ${user ? '✅ ' + user : '❌ NOT SET'}`);
    console.log(`  SMTP_PASS:  ${pass ? '✅ ****' : '❌ NOT SET'}`);
    console.log(`  SMTP_FROM:  ${fromAddress}`);
    console.log('');

    if (!host || !user || !pass) {
        console.log('❌ Missing required SMTP configuration!');
        console.log('Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file');
        process.exit(1);
    }

    try {
        console.log('🔄 Creating SMTP transporter...');
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });

        console.log('🔄 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!\n');

        console.log(`🔄 Sending test email to ${testEmail}...`);
        const result = await transporter.sendMail({
            from: fromAddress,
            to: testEmail,
            subject: '✅ Enqoy Email Test - SMTP Working!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h1 style="color: #22c55e; text-align: center;">🎉 Email Test Successful!</h1>
                    <p style="text-align: center; font-size: 18px;">Your SMTP configuration is working correctly.</p>
                    <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p><strong>SMTP Host:</strong> ${host}</p>
                        <p><strong>SMTP Port:</strong> ${port}</p>
                        <p><strong>From:</strong> ${fromAddress}</p>
                        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                    </div>
                    <p style="text-align: center; color: #666; margin-top: 20px;">— Enqoy Team</p>
                </div>
            `,
        });

        console.log('✅ Email sent successfully!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`\n📬 Check your inbox at ${testEmail}`);

    } catch (error: any) {
        console.error('❌ Email test failed!');
        console.error(`   Error: ${error.message}`);

        if (error.message.includes('auth')) {
            console.log('\n💡 Tip: Check your SMTP_USER and SMTP_PASS');
            console.log('   For Zoho, use an App-Specific Password from:');
            console.log('   https://accounts.zoho.com → Security → App Passwords');
        }

        process.exit(1);
    }
}

testEmail();
