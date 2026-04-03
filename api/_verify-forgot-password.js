const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, contactNumber, email } = req.body;

    if (!username || !contactNumber || !email) {
      return res.status(400).json({ error: 'Username, contact number, and email are required' });
    }

    const client = await pool.connect();

    // Verify all 3 pieces of information match
    const studentResult = await client.query(
      'SELECT id, first_name, last_name FROM students WHERE username = $1 AND contact_number = $2 AND email = $3',
      [username, contactNumber, email]
    );

    if (studentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'No matching account found. Please check your information.' });
    }

    const student = studentResult.rows[0];

    client.release();

    res.status(200).json({
      success: true,
      message: 'Account verified successfully. You can now reset your password.',
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`
    });

  } catch (error) {
    console.error('Forgot password verification error:', error);
    res.status(500).json({ error: 'Failed to verify account. Please try again.' });
  }
};
