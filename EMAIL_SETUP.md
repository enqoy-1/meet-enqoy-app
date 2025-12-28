# Email Setup with Resend

This guide will help you set up email notifications for Enqoy using Resend.

## What's Been Implemented

### 1. **Booking Confirmation Emails**
- Sent automatically when a user books an event
- Includes event details (title, date, price)
- Shows what's next (venue reveal, bring a friend, icebreakers)
- Professional HTML template with Enqoy branding

### 2. **Friend Invitation Emails**
- Sent when someone invites a friend to an event
- Includes personalized invitation with inviter's name
- Direct link to accept and book
- Expiration notice (24 hours before event)

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** in the sidebar
3. Click **Create API Key**
4. Name it something like "Enqoy Dev"
5. Copy the API key (it starts with `re_`)

### Step 3: Add API Key to Environment Variables

1. Open `backend/.env`
2. Find the line: `RESEND_API_KEY=your_resend_api_key_here`
3. Replace `your_resend_api_key_here` with your actual API key

```env
RESEND_API_KEY=re_your_actual_key_here
FRONTEND_URL=http://localhost:8080
```

### Step 4: Verify Your Domain (Optional but Recommended)

**For development:**
- You can use the default Resend domain (`noreply@resend.dev`)
- Emails will work but may go to spam

**For production:**
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `enqoy.com`)
4. Add the DNS records Resend provides
5. Wait for verification
6. Update the `from` email in `backend/src/email/email.service.ts`:
   ```typescript
   from: 'Enqoy <noreply@yourdomain.com>'
   ```

### Step 5: Test the Email

1. Restart your backend server
2. Book an event through the app
3. Check your email inbox
4. You should receive a booking confirmation email

## Email Templates

### Booking Confirmation Email Includes:
- ✅ Green checkmark icon
- 🎉 Congratulations message
- 📋 Event details (title, date, price)
- 📍 Venue reveal information
- 👥 Friend invitation info
- 💬 Icebreaker reminder
- 🔗 Link to dashboard

### Friend Invitation Email Includes:
- 🎉 Invitation header
- 👤 Inviter's name
- 📋 Event details
- 🔗 Direct booking link
- ⏰ Expiration notice

## Troubleshooting

### Emails Not Sending

1. **Check API Key:** Make sure your `RESEND_API_KEY` is set correctly in `.env`
2. **Check Console:** Look for error messages in your backend console
3. **Check Resend Dashboard:** Go to **Logs** to see if emails were sent
4. **Check Spam:** Emails might be in spam folder during development

### Emails in Console Only

If you see messages like "Email service not configured" in the console:
- This means the `RESEND_API_KEY` is not set
- Emails won't be sent but the app will work fine
- Add the API key to `.env` and restart the server

### Custom Domain Not Working

- Wait 24-48 hours for DNS propagation
- Verify all DNS records are added correctly
- Check Resend dashboard for verification status

## Cost

**Free Tier:**
- 100 emails per day
- 3,000 emails per month
- Perfect for development and small-scale testing

**Paid Plans:**
- $20/month for 50,000 emails
- Additional emails at $0.001 each

## Support

For Resend support:
- Documentation: [resend.com/docs](https://resend.com/docs)
- Support: support@resend.com
- Status: [status.resend.com](https://status.resend.com)
