// api/loginstudent.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  getLoginAttemptState,
  registerLoginFailure,
  clearLoginFailures,
  validateRequiredFields,
  validateMaxLength,
  isSafeText,
} = require('./_security');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { username, password } = req.body;
    const required = validateRequiredFields(req.body, ['username', 'password']);
    if (!required.valid) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (!validateMaxLength(username, 64) || !validateMaxLength(password, 128)) {
      return res.status(400).json({ message: 'Input exceeds allowed length.' });
    }
    if (!isSafeText(username) || !isSafeText(password)) {
      return res.status(400).json({ message: 'Invalid input detected.' });
    }

    const lockState = getLoginAttemptState(username, req);
    if (lockState.lockedUntil) {
      return res.status(423).json({ message: 'Account temporarily locked due to multiple failed attempts. Please try again later.' });
    }

    try {
      const client = await pool.connect();
      
      const studentQuery = `
        SELECT s.*, e.idpic, e.enrollment_status, e.enrollment_date
        FROM students s
        LEFT JOIN enrollments e ON s.id = e.student_id
        WHERE s.username = $1
        ORDER BY e.enrollment_date DESC
        LIMIT 1
      `;

      const result = await client.query(studentQuery, [username]);

      if (result.rows.length === 0) {
        registerLoginFailure(username, req);
        client.release();
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        registerLoginFailure(username, req);
        client.release();
        return res.status(401).json({ message: "Invalid credentials" });
      }

      clearLoginFailures(username, req);

      const idpicBase64 = user.idpic ? Buffer.from(user.idpic).toString('base64') : null;

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          enrollment_status: user.enrollment_status 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          fullName: `${user.first_name} ${user.last_name}`,
          role: user.role,
          idpic: idpicBase64,
          enrollment_status: user.enrollment_status || 'Not Enrolled',
          enrollment_date: user.enrollment_date
        },
      });

      client.release();
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
