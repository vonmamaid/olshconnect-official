const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(`
        SELECT tf.*, p.program_name 
        FROM tuition_fees tf
        JOIN program p ON tf.program_id = p.program_id
        ORDER BY p.program_name, tf.year_level, tf.semester
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching tuition fees:", error);
      res.status(500).json({ 
        error: "Failed to fetch tuition fees",
        details: error.message 
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};