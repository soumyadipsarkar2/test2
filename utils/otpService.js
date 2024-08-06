const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send OTP
const sendOtp = async (phoneNumber) => {
  try {
    // Create a verification request
    await client.verify.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phoneNumber, channel: 'sms' });

    console.log(`OTP sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return false;
  }
};

// Validate OTP
const validateOtp = async (phoneNumber, code) => {
  try {
    const verificationCheck = await client.verify.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phoneNumber, code: code });

    if (verificationCheck.status === 'approved') {
      console.log('OTP validated successfully');
      return true;
    } else {
      console.log('Invalid OTP');
      return false;
    }
  } catch (error) {
    console.error('Failed to validate OTP:', error);
    return false;
  }
};

module.exports = {
  sendOtp,
  validateOtp
};