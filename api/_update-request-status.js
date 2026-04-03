const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = authenticateToken(req);
    const { req_id } = req.query;
    const { status } = req.body;

    if (!status || !['Approved', 'Rejected', 'Ready for Pickup'].includes(status)) {
      return res.status(400).json({ message: "Invalid status provided" });
    }

    const updateResult = await pool.query(
      "UPDATE documentrequest SET req_status = $1 WHERE req_id = $2 RETURNING *",
      [status, req_id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const result = await pool.query(
      `SELECT 
        dr.req_id,
        dr.doc_type,
        dr.description,
        dr.req_date,
        dr.req_status,
        CONCAT(s.first_name, ' ', s.last_name) as student_name
      FROM 
        documentrequest dr
      JOIN 
        students s ON dr.id = s.id
      WHERE 
        dr.req_id = $1`,
      [req_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Server error while updating request status" });
  }
};