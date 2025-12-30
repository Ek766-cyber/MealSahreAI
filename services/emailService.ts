import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };

    // Only initialize if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('✉️  Email service initialized');
    } else {
      console.warn('⚠️  Email credentials not configured. Email service disabled.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Email service not initialized. Check your EMAIL_USER and EMAIL_PASSWORD environment variables.');
      return false;
    }

    try {
      const mailOptions = {
        from: `"MealShare AI" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || this.generateDefaultHTML(options.subject, options.text),
      };

      console.log(`📧 Attempting to send email to: ${options.to}`);
      console.log(`📋 Subject: ${options.subject}`);

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      console.log(`📬 Accepted recipients:`, info.accepted);
      console.log(`❌ Rejected recipients:`, info.rejected);
      
      return true;
    } catch (error: any) {
      console.error('❌ Error sending email:');
      console.error('   Error message:', error.message);
      if (error.code) console.error('   Error code:', error.code);
      if (error.command) console.error('   Failed command:', error.command);
      if (error.response) console.error('   Server response:', error.response);
      
      return false;
    }
  }

  async sendNotificationEmail(
    recipientEmail: string,
    recipientName: string,
    message: string,
    amountOwed?: number
  ): Promise<boolean> {
    const subject = amountOwed && amountOwed > 0 
      ? `MealShare: Payment Reminder - $${amountOwed.toFixed(2)} Outstanding`
      : 'MealShare: Account Notification';

    const html = this.generateNotificationHTML(recipientName, message, amountOwed);

    return this.sendEmail({
      to: recipientEmail,
      subject,
      text: message,
      html,
    });
  }

  private generateDefaultHTML(subject: string, text: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin-top: 0;">${subject}</h2>
                      <p style="color: #666666; line-height: 1.6; font-size: 14px;">${text}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">MealShare AI - Meal Management System</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private generateNotificationHTML(name: string, message: string, amountOwed?: number): string {
    const owesSection = amountOwed && amountOwed > 0 ? `
      <div style="background-color: #fff3f3; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #dc2626; font-size: 18px; font-weight: bold; margin: 0;">
          Outstanding Balance: $${amountOwed.toFixed(2)}
        </p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-align: center;">
                        🍽️ MealShare AI
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${name},</p>
                      
                      ${owesSection}
                      
                      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="color: #4b5563; line-height: 1.7; font-size: 15px; margin: 0; white-space: pre-wrap;">${message}</p>
                      </div>
                      
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Thank you for using MealShare AI to manage your shared meals efficiently!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                        This is an automated message from MealShare AI<br>
                        © ${new Date().getFullYear()} MealShare AI. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email server connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email server connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
