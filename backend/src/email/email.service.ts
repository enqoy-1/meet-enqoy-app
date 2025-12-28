import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor() {
    // Initialize Nodemailer with SMTP configuration from environment variables
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.fromAddress = process.env.SMTP_FROM || 'Enqoy <noreply@enqoy.com>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });
      console.log('Email service configured with SMTP');
    } else {
      console.warn('SMTP configuration not found. Email functionality will be disabled.');
      console.warn('Required env vars: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }
  }

  async sendBookingConfirmation(data: {
    to: string;
    userName: string;
    eventTitle: string;
    eventDate: string;
    eventPrice: number;
  }) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send booking confirmation to:', data.to);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: data.to,
        subject: `Booking Confirmed: ${data.eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .detail-label { font-weight: bold; color: #666; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Booking Confirmed!</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.userName},</p>
                  <p>Great news! Your booking has been confirmed.</p>

                  <div class="details">
                    <h2 style="margin-top: 0;">Event Details</h2>
                    <div class="detail-row">
                      <span class="detail-label">Event:</span>
                      <span>${data.eventTitle}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Date & Time:</span>
                      <span>${data.eventDate}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Price:</span>
                      <span>$${data.eventPrice}</span>
                    </div>
                  </div>

                  <h3>What's Next?</h3>
                  <ul>
                    <li>📍 The venue location will be revealed 48 hours before the event</li>
                    <li>👥 You can invite friends to join you until the venue is revealed</li>
                    <li>💬 Complete your icebreaker responses to get matched with the perfect group</li>
                  </ul>

                  <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="button">
                      View My Dashboard
                    </a>
                  </p>

                  <p>We're excited to see you at the event!</p>
                  <p>Best regards,<br>The Enqoy Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Enqoy. All rights reserved.</p>
                  <p>Building meaningful connections through shared experiences</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Booking confirmation email sent to:', data.to);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      // Don't throw error - we don't want booking to fail if email fails
    }
  }

  async sendFriendInvitation(data: {
    to: string;
    friendName: string;
    inviterName: string;
    eventTitle: string;
    eventDate: string;
    invitationToken: string;
  }) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send friend invitation to:', data.to);
      return;
    }

    try {
      const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/invite/${data.invitationToken}`;

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: data.to,
        subject: `${data.inviterName} invited you to ${data.eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .invitation-card { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                .button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 You're Invited!</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.friendName},</p>
                  <p><strong>${data.inviterName}</strong> has invited you to join them at an exciting event!</p>

                  <div class="invitation-card">
                    <h2 style="margin-top: 0; color: #667eea;">${data.eventTitle}</h2>
                    <p><strong>📅 Date:</strong> ${data.eventDate}</p>
                    <p style="margin-top: 15px;">Join ${data.inviterName} for an evening of great food, conversation, and new connections.</p>
                  </div>

                  <p style="text-align: center;">
                    <a href="${invitationUrl}" class="button">
                      Accept Invitation & Book
                    </a>
                  </p>

                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    ⏰ This invitation expires 24 hours before the event starts.
                  </p>

                  <p>See you there!</p>
                  <p>Best regards,<br>The Enqoy Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Enqoy. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Friend invitation email sent to:', data.to);
    } catch (error) {
      console.error('Error sending friend invitation email:', error);
    }
  }

  // Email for when booker pays for their friend
  async sendFriendPaidInvitation(data: {
    to: string;
    friendName: string;
    inviterName: string;
    eventTitle: string;
    eventDate: string;
  }) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send paid friend invitation to:', data.to);
      return;
    }

    try {
      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard`;

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: data.to,
        subject: `🎉 You're invited to ${data.eventTitle}!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .invitation-card { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
                .paid-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 15px; }
                .button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎁 You Got an Invitation!</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.friendName},</p>
                  <p>Great news! <strong>${data.inviterName}</strong> has invited you to join them at an Enqoy event and already covered your spot!</p>

                  <div class="invitation-card">
                    <span class="paid-badge">✓ Already Paid</span>
                    <h2 style="margin-top: 10px; color: #667eea;">${data.eventTitle}</h2>
                    <p><strong>📅 Date:</strong> ${data.eventDate}</p>
                    <p style="margin-top: 15px;">You're all set! Just show up and enjoy an evening of great food, conversation, and new connections with ${data.inviterName}.</p>
                  </div>

                  <h3>What's Next?</h3>
                  <ul>
                    <li>📍 Event details will be sent 1 day before</li>
                    <li>👥 You'll be paired with great people</li>
                    <li>💬 Optionally, take our personality assessment for better matching</li>
                  </ul>

                  <p style="text-align: center;">
                    <a href="${dashboardUrl}" class="button">
                      View Event Details
                    </a>
                  </p>

                  <p>See you there!</p>
                  <p>Best regards,<br>The Enqoy Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Enqoy. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Friend paid invitation email sent to:', data.to);
    } catch (error) {
      console.error('Error sending friend paid invitation email:', error);
    }
  }

  async sendPaymentVerified(data: {
    to: string;
    userName: string;
    eventTitle: string;
    eventDate: string;
    amount: number;
    autoVerified: boolean;
  }) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send payment verification to:', data.to);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: data.to,
        subject: `✅ Payment Verified - ${data.eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .success-badge { background: #22c55e; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: bold; margin: 20px 0; }
                .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .detail-label { font-weight: bold; color: #666; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Payment Verified!</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.userName},</p>
                  <p>Great news! Your payment has been ${data.autoVerified ? 'automatically' : 'successfully'} verified and your booking is now confirmed.</p>

                  <div style="text-align: center;">
                    <span class="success-badge">✓ BOOKING CONFIRMED</span>
                  </div>

                  <div class="details">
                    <h2 style="margin-top: 0;">Payment Details</h2>
                    <div class="detail-row">
                      <span class="detail-label">Event:</span>
                      <span>${data.eventTitle}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Date & Time:</span>
                      <span>${data.eventDate}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Amount Paid:</span>
                      <span>${data.amount} ETB</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status:</span>
                      <span style="color: #22c55e; font-weight: bold;">CONFIRMED</span>
                    </div>
                  </div>

                  <h3>What's Next?</h3>
                  <ul>
                    <li>📍 The venue location will be revealed 48 hours before the event</li>
                    <li>👥 You'll receive your group pairing details before the event</li>
                    <li>💬 Complete your icebreaker responses for better matching</li>
                    <li>📧 We'll send you a reminder 24 hours before the event</li>
                  </ul>

                  <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="button">
                      View My Bookings
                    </a>
                  </p>

                  <p>We're excited to see you at the event!</p>
                  <p>Best regards,<br>The Enqoy Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Enqoy. All rights reserved.</p>
                  <p>Building meaningful connections through shared experiences</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Payment verification email sent to:', data.to);
    } catch (error) {
      console.error('Error sending payment verification email:', error);
    }
  }

  async sendPaymentRejected(data: {
    to: string;
    userName: string;
    eventTitle: string;
    amount: number;
    reason?: string;
  }) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send payment rejection to:', data.to);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: data.to,
        subject: `Payment Needs Attention - ${data.eventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .detail-label { font-weight: bold; color: #666; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ Payment Needs Attention</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.userName},</p>
                  <p>We've reviewed your payment submission for <strong>${data.eventTitle}</strong>, but unfortunately we couldn't verify it.</p>

                  ${data.reason ? `
                  <div class="warning-box">
                    <strong>Reason:</strong> ${data.reason}
                  </div>
                  ` : ''}

                  <div class="details">
                    <h2 style="margin-top: 0;">Payment Details</h2>
                    <div class="detail-row">
                      <span class="detail-label">Event:</span>
                      <span>${data.eventTitle}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Amount:</span>
                      <span>${data.amount} ETB</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status:</span>
                      <span style="color: #ef4444; font-weight: bold;">NEEDS VERIFICATION</span>
                    </div>
                  </div>

                  <h3>What to Do Next?</h3>
                  <ol>
                    <li><strong>Double-check your transaction:</strong> Make sure you sent the payment to the correct account</li>
                    <li><strong>Verify the amount:</strong> Ensure you paid the exact amount (${data.amount} ETB)</li>
                    <li><strong>Resubmit with correct details:</strong> You can submit your payment again with the correct transaction ID or screenshot</li>
                    <li><strong>Contact support:</strong> If you believe this is an error, please contact us</li>
                  </ol>

                  <p style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="button">
                      Resubmit Payment
                    </a>
                  </p>

                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <strong>Payment Account Details:</strong><br>
                    TeleBirr: ${process.env.TELEBIRR_ACCOUNT || '0945202986'}<br>
                    CBE: ${process.env.CBE_ACCOUNT || '1000340187807'}
                  </div>

                  <p>Need help? Reply to this email and we'll assist you.</p>
                  <p>Best regards,<br>The Enqoy Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Enqoy. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Payment rejection email sent to:', data.to);
    } catch (error) {
      console.error('Error sending payment rejection email:', error);
    }
  }

  async sendPasswordResetEmail(data: {
    to: string;
    resetToken: string;
    userName: string;
  }) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send password reset to:', data.to);
      return;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${data.resetToken}`;

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: data.to,
        subject: '🔒 Reset Your Enqoy Password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔒 Password Reset Request</h1>
                </div>
                <div class="content">
                  <p>Hi ${data.userName},</p>
                  <p>We received a request to reset the password for your Enqoy account.</p>
                  
                  <p>If you didn't make this request, you can safely ignore this email.</p>

                  <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">
                      Reset Password
                    </a>
                  </p>

                  <p style="margin-top: 30px; font-size: 14px;">
                    This link will expire in 1 hour.
                  </p>

                  <p>Best regards,<br>The Enqoy Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Enqoy. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Password reset email sent to:', data.to);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return {
        success: false,
        message: 'SMTP not configured. Missing: SMTP_HOST, SMTP_USER, or SMTP_PASS',
      };
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: '✅ Enqoy Email Test - It Works!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h1 style="color: #22c55e; text-align: center;">🎉 Email Test Successful!</h1>
            <p style="text-align: center; font-size: 18px;">Your SMTP configuration is working correctly.</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
              <p><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</p>
              <p><strong>From:</strong> ${this.fromAddress}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <p style="text-align: center; color: #666; margin-top: 20px;">— Enqoy Team</p>
          </div>
        `,
      });

      console.log('✅ Test email sent successfully to:', to);
      return {
        success: true,
        message: `Test email sent to ${to}`,
      };
    } catch (error: any) {
      console.error('❌ Test email failed:', error);
      return {
        success: false,
        message: `Failed to send: ${error.message}`,
      };
    }
  }
}
