// Quick diagnostic script to test email functionality
// Run with: node --loader ts-node/esm test-email.ts
// Or with tsx: tsx test-email.ts

import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔍 Email Configuration Diagnostic\n');
console.log('=' .repeat(50));

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NOT SET');
console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NOT SET');
console.log('   EMAIL_SECURE:', process.env.EMAIL_SECURE || 'false');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET (' + process.env.EMAIL_PASSWORD.length + ' chars)' : '❌ NOT SET');

// Check if nodemailer is installed
console.log('\n2. Dependencies:');
try {
  const nodemailer = await import('nodemailer');
  console.log('   nodemailer: ✅ Installed');
  
  // Try to create transport
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('\n3. Testing SMTP Connection...');
    
    const transporter = nodemailer.default.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    try {
      await transporter.verify();
      console.log('   ✅ SMTP connection successful!');
      console.log('   Your email service is properly configured.');
      
      // Optionally send a test email
      const testEmail = process.argv[2]; // Get email from command line
      if (testEmail) {
        console.log(`\n4. Sending test email to ${testEmail}...`);
        
        const info = await transporter.sendMail({
          from: `"MealShare AI Test" <${process.env.EMAIL_USER}>`,
          to: testEmail,
          subject: 'MealShare AI - Test Email',
          text: 'If you received this, your email configuration is working perfectly!',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #4f46e5;">✅ Success!</h2>
              <p>Your MealShare AI email service is configured correctly.</p>
              <p>You can now send notifications to your members.</p>
            </div>
          `
        });
        
        console.log('   ✅ Test email sent successfully!');
        console.log('   Message ID:', info.messageId);
        console.log('   Check your inbox:', testEmail);
      } else {
        console.log('\n4. Test Email:');
        console.log('   To send a test email, run:');
        console.log(`   tsx test-email.ts your-email@example.com`);
      }
      
    } catch (error: any) {
      console.log('   ❌ SMTP connection failed!');
      console.log('   Error:', error.message);
      
      if (error.code === 'EAUTH') {
        console.log('\n   🔧 Authentication Error - Possible Solutions:');
        console.log('   1. Make sure you\'re using an App Password (not your regular Gmail password)');
        console.log('   2. Generate a new App Password at: https://myaccount.google.com/apppasswords');
        console.log('   3. Enable 2-Step Verification on your Google Account');
        console.log('   4. Make sure the password has no spaces (should be 16 characters)');
      } else if (error.code === 'ESOCKET') {
        console.log('\n   🔧 Connection Error - Possible Solutions:');
        console.log('   1. Check your internet connection');
        console.log('   2. Verify EMAIL_HOST and EMAIL_PORT are correct');
        console.log('   3. Try using port 465 with EMAIL_SECURE=true');
      }
    }
  } else {
    console.log('\n3. SMTP Connection:');
    console.log('   ⚠️  Cannot test - EMAIL_USER or EMAIL_PASSWORD not set');
  }
  
} catch (error) {
  console.log('   ❌ nodemailer: NOT INSTALLED');
  console.log('   Run: yarn add nodemailer');
}

console.log('\n' + '='.repeat(50));
console.log('\n');
