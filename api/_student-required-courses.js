const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    const err = new Error('No token provided');
    err.status = 401;
    throw err;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    const err = new Error('Invalid token');
    err.status = 401;
    throw err;
  }
}

module.exports = async (req, res) => {
  let client;
  try {
    authenticateToken(req);

    if (req.method === 'POST') {
      const { student_id, pc_id, reason } = req.body;
      if (!student_id || !pc_id) {
        return res.status(400).json({ error: 'student_id and pc_id are required' });
      }
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO student_required_courses (student_id, pc_id, reason)
         VALUES ($1, $2, COALESCE($3,'not_taken'))
         ON CONFLICT (student_id, pc_id) DO UPDATE SET reason = EXCLUDED.reason`,
        [student_id, pc_id, reason || 'not_taken']
      );
      await client.query('COMMIT');
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const { student_id } = req.query;
      if (!student_id) {
        return res.status(400).json({ error: 'student_id is required' });
      }
      client = await pool.connect();
      const result = await client.query(
        `SELECT src.pc_id, pc.year_id, pc.semester, c.course_code, c.course_name, c.units, src.reason
         FROM student_required_courses src
         JOIN program_course pc ON pc.pc_id = src.pc_id
         JOIN course c ON c.course_id = pc.course_id
         WHERE src.student_id = $1
         ORDER BY c.course_code`,
        [student_id]
      );
      return res.status(200).json({ success: true, required: result.rows });
    }

    if (req.method === 'DELETE') {
      const { student_id, pc_id } = req.query;
      if (!student_id || !pc_id) {
        return res.status(400).json({ error: 'student_id and pc_id are required' });
      }
      client = await pool.connect();
      await client.query(`DELETE FROM student_required_courses WHERE student_id = $1 AND pc_id = $2`, [student_id, pc_id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
  }
};


