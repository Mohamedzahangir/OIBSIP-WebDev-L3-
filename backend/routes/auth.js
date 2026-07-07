const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Generate verification details
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = new User({
      name,
      email,
      password,
      role: 'user',
      isVerified: false,
      verificationToken: token,
      verificationTokenExpires: tokenExpiry
    });

    await user.save();

    // Send verification email
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = `${protocol}://${req.get('host')}`;
    const frontendUrl = process.env.FRONTEND_URL || origin;
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;
    
    const subject = '🍕 Verify your PizzaApp account!';
    const text = `Hi ${name},\n\nWelcome to PizzaApp! Please verify your email by clicking the link: ${verifyLink}\n\nThis link is valid for 24 hours.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px; text-align: center;">🍕 Welcome to PizzaApp!</h2>
        <p>Hi ${name},</p>
        <p>We are excited to have you join us. Please click the button below to verify your email address and get started ordering delicious pizzas:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #777;">If the button above does not work, copy and paste the following URL into your browser:</p>
        <p style="font-size: 12px; color: #d9534f; word-break: break-all;">${verifyLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">This verification link will expire in 24 hours.</p>
      </div>
    `;

    const mailRes = await sendEmail({ to: email, subject, text, html });

    res.status(201).json({ 
      message: 'Registration successful! Verification email sent.',
      previewUrl: (mailRes && mailRes.previewUrl) || null 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Verify Email
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during email verification', error: error.message });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'super_pizza_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Forgot Password Request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    // Security best practice: don't reveal user existence
    if (!user) {
      return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
    await user.save();

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = `${protocol}://${req.get('host')}`;
    const frontendUrl = process.env.FRONTEND_URL || origin;
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const subject = '🍕 Reset your PizzaApp password';
    const text = `You requested a password reset. Please use the following link to reset your password: ${resetLink}\n\nIf you did not make this request, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px; text-align: center;">🍕 Password Reset</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your PizzaApp account. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #777;">If the button above does not work, copy and paste the following URL into your browser:</p>
        <p style="font-size: 12px; color: #d9534f; word-break: break-all;">${resetLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you did not request this, you can safely ignore this email. This link will expire in 1 hour.</p>
      </div>
    `;

    const mailRes = await sendEmail({ to: email, subject, text, html });

    res.json({
      message: 'If that email is registered, a password reset link has been sent.',
      previewUrl: (mailRes && mailRes.previewUrl) || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during forgot password', error: error.message });
  }
});

// Reset Password Execution
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password (will be hashed automatically via userSchema.pre('save'))
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during password reset', error: error.message });
  }
});

// Separate Admin Login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ message: 'Access Denied: Invalid credentials or not an admin account' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Access Denied: Invalid credentials or not an admin account' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'super_pizza_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during admin login', error: error.message });
  }
});

const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/resend-verification', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = token;
    user.verificationTokenExpires = tokenExpiry;
    await user.save();

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = `${protocol}://${req.get('host')}`;
    const frontendUrl = process.env.FRONTEND_URL || origin;
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

    const subject = '🍕 Verify your PizzaApp account!';
    const text = `Hi ${user.name},\n\nPlease verify your email by clicking the link: ${verifyLink}\n\nThis link is valid for 24 hours.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px; text-align: center;">🍕 Welcome to PizzaApp!</h2>
        <p>Hi ${user.name},</p>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #d9534f; word-break: break-all;">${verifyLink}</p>
      </div>
    `;

    const mailRes = await sendEmail({ to: user.email, subject, text, html });

    res.json({
      message: 'Verification email resent successfully!',
      previewUrl: (mailRes && mailRes.previewUrl) || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resending verification email', error: error.message });
  }
});

module.exports = router;
