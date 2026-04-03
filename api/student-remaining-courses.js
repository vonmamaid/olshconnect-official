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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;
  try {
    authenticateToken(req);
    const {
      student_id,
      program_id,
      year_id,
      semester,
      tor_request_id
    } = req.query;

    if (!student_id || !program_id || !year_id || !semester) {
      return res.status(400).json({ error: 'student_id, program_id, year_id, semester are required' });
    }

    client = await pool.connect();

    // Credited internal courses (by course_id) from course_equivalencies for this TOR request
    let creditedCourseIds = [];
    if (tor_request_id) {
      const creditedRes = await client.query(
        `SELECT DISTINCT equivalent_course_id AS course_id
         FROM course_equivalencies
         WHERE tor_request_id = $1 AND equivalent_course_id IS NOT NULL`,
        [tor_request_id]
      );
      creditedCourseIds = creditedRes.rows.map(r => Number(r.course_id));
    }

    // Already graded/finalized courses for this student and term (by course_id via pc join)
    const gradedRes = await client.query(
      `SELECT DISTINCT pc.course_id
       FROM grades g
       JOIN program_course pc ON pc.pc_id = g.pc_id
       WHERE g.student_id = $1
         AND pc.program_id = $2
         AND pc.year_id = $3
         AND pc.semester = $4
         AND g.approval_status IN ('reg_approved','registrar_approved','final')`,
      [student_id, program_id, year_id, semester]
    );
    const gradedCourseIds = gradedRes.rows.map(r => Number(r.course_id));

    // Existing required courses for this student (for info)
    const reqRes = await client.query(
      `SELECT src.pc_id, pc.course_id, c.course_code, c.course_name, c.units
       FROM student_required_courses src
       JOIN program_course pc ON pc.pc_id = src.pc_id
       JOIN course c ON c.course_id = pc.course_id
       WHERE src.student_id = $1`,
      [student_id]
    );
    const requiredCourses = reqRes.rows;

    // Remaining courses for the current semester: ALL courses from this semester regardless of year level
    const remainingRes = await client.query(
      `SELECT pc.pc_id, c.course_id, c.course_code, c.course_name, c.units, py.year_level
       FROM program_course pc
       JOIN course c ON c.course_id = pc.course_id
       JOIN program_year py ON py.year_id = pc.year_id
       WHERE pc.program_id = $1 AND pc.semester = $2
       ORDER BY py.year_level, c.course_code`,
      [program_id, semester]
    );

    const creditedSet = new Set(creditedCourseIds);
    const gradedSet = new Set(gradedCourseIds);

    const remainingCourses = remainingRes.rows.filter(r =>
      !creditedSet.has(Number(r.course_id)) && !gradedSet.has(Number(r.course_id))
    );

    return res.status(200).json({
      success: true,
      creditedCourseIds,
      gradedCourseIds,
      remainingCourses,
      requiredCourses
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Server error' });
  } finally {
    if (client) client.release();
  }
};


