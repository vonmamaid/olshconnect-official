const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { pc_id } = req.query;
    let client;

    try {
      client = await pool.connect();
      
      const result = await client.query(
        `SELECT 
          pc.pc_id,
          pc.program_id,
          pc.year_level,
          pc.semester,
          c.course_code,
          c.course_name,
          c.units,
          ca.section,
          ca.day,
          ca.start_time,
          ca.end_time,
          a.staff_id,
          a.full_name as instructor_name,
          p.program_name
         FROM program_course pc
         JOIN course c ON pc.course_id = c.course_id
         JOIN program p ON pc.program_id = p.program_id
         LEFT JOIN course_assignments ca ON pc.pc_id = ca.pc_id
         LEFT JOIN admins a ON ca.staff_id = a.staff_id
         WHERE pc.pc_id = $1`,
        [pc_id]
      );

      if (result.rows.length > 0) {
        const data = result.rows[0];
        // Format times for display
        if (data.start_time) data.start_time = data.start_time.slice(0, 5);
        if (data.end_time) data.end_time = data.end_time.slice(0, 5);
        res.json(data);
      } else {
        res.status(404).json({ error: "Course assignment not found" });
      }
    } catch (error) {
      console.error("Error fetching course assignment details:", error);
      res.status(500).json({ error: "Failed to fetch course assignment details" });
    } finally {
      if (client) client.release();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};