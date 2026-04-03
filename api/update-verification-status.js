const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  if (req.method === 'PUT') {
    const { email, phoneNumber, type } = req.body; // type: 'email' or 'phone'

    try {
      if (!email && !phoneNumber) {
        return res.status(400).json({ error: 'Email or phone number is required' });
      }

      const client = await pool.connect();

      let updateQuery;
      let queryParams;

      if (type === 'email' && email) {
        updateQuery = 'UPDATE students SET email_verified = true WHERE email = $1';
        queryParams = [email];
      } else if (type === 'phone' && phoneNumber) {
        updateQuery = 'UPDATE students SET phone_verified = true WHERE contact_number = $1';
        queryParams = [phoneNumber];
      } else {
        return res.status(400).json({ error: 'Invalid verification type' });
      }

      const result = await client.query(updateQuery, queryParams);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.json({ 
        success: true, 
        message: `${type} verification status updated successfully` 
      });

      client.release();
    } catch (error) {
      console.error('Error updating verification status:', error);
      res.status(500).json({ 
        error: 'Failed to update verification status',
        details: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
