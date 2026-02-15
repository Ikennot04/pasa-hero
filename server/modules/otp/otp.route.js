import express from 'express';
import { sendOtp, testEmailConfig, checkServerStatus, resetPassword } from './otp.controller.js';

const router = express.Router();

// Server status check (helps diagnose connection issues)
router.get('/status', checkServerStatus);

// OTP routes
router.post('/send', sendOtp);

// Password reset route (after OTP verification)
router.post('/reset-password', resetPassword);

// Test email configuration (for debugging - remove in production or add authentication)
router.get('/test-config', testEmailConfig);

export default router;
