require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
    console.log('--- Email Debugger ---');
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = process.env.SMTP_PORT;

    console.log(`Config: Host=${host}, Port=${port}, User=${user ? '***' : 'Missing'}, Pass=${pass ? '***' : 'Missing'}`);

    if (!host || !user || !pass) {
        console.error('❌ Missing Required ENV Variables.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port || '587'),
        secure: parseInt(port) === 465,
        auth: {
            user: user,
            pass: pass,
        },
    });

    try {
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP Connection Successful!');

        console.log('Attempting to send mail to self...');
        const fromAddr = process.env.SMTP_FROM || 'Enqoy <noreply@enqoy.com>';
        console.log(`From: ${fromAddr}`);
        console.log(`To: ${user}`);

        await transporter.sendMail({
            from: fromAddr,
            to: user,
            subject: 'Enqoy Debug Test',
            text: 'This is a test email to verify sender permissions.',
        });
        console.log('✅ Mail Sent Successfully!');

    } catch (error) {
        console.error('❌ SMTP Verification Failed:', error.message);
        if (error.code === 'EAUTH') console.error('  -> Check Username/Password.');
        if (error.code === 'ESOCKET') console.error('  -> Check Host/Port.');
    }
}

test();
