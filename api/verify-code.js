const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// This should match the verificationCodes from send-verification-code.js
// In production, use Redis or database to store verification codes
const verificationCodes = new Map();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { email, phoneNumber, code, type } = req.body;

    try {
      if (!code) {
        return res.status(400).json({ error: 'Verification code is required' });
      }

      let verificationKey;
      if (type === 'email' && email) {
        verificationKey = email;
      } else if (type === 'phone' && phoneNumber) {
        verificationKey = phoneNumber;
      } else {
        return res.status(400).json({ error: 'Invalid verification type or missing contact info' });
      }

      const storedData = verificationCodes.get(verificationKey);
      
      if (!storedData) {
        return res.status(400).json({ error: 'No verification code found or code has expired' });
      }

      if (storedData.expiresAt < new Date()) {
        verificationCodes.delete(verificationKey);
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      if (storedData.otp !== code) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Code is valid, remove it from storage
      verificationCodes.delete(verificationKey);

      res.json({ 
        success: true, 
        message: 'Verification successful',
        verified: true
      });

    } catch (error) {
      console.error('Error verifying code:', error);
      res.status(500).json({ 
        error: 'Failed to verify code',
        details: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
