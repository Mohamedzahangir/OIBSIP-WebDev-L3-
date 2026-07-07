const nodemailer = require('nodemailer');

let transporter = null;
let isEthereal = false;

async function getTransporter() {
  if (transporter) return transporter;

  const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSMTP) {
    console.log('Using configured SMTP settings for mail delivery.');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    isEthereal = false;
  } else {
    console.log('No SMTP config found in .env. Dynamically creating a temporary Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('Ethereal test account successfully created:');
      console.log(`- User: ${testAccount.user}`);
      console.log(`- Pass: ${testAccount.pass}`);
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEthereal = true;
    } catch (err) {
      console.error('Failed to create Ethereal SMTP test account:', err);
      throw err;
    }
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  try {
    const activeTransporter = await getTransporter();
    const fromAddress = process.env.SMTP_USER || '"PizzaApp Master Chef" <noreply@pizzaapp.com>';
    
    const info = await activeTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email successfully sent: "${subject}" to ${to}`);
    
    if (isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Ethereal Alert] Preview URL: ${previewUrl}`);
      return { success: true, messageId: info.messageId, previewUrl };
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return { success: false, error: error.message };
  }
}

async function initEmailTransporter() {
  try {
    await getTransporter();
  } catch (err) {
    console.error('Failed to pre-initialize email transporter:', err);
  }
}

module.exports = { sendEmail, initEmailTransporter };
