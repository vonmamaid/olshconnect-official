const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateToken = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method === 'PUT') {
    try {
      const decoded = authenticateToken(req, res);
      const enrollmentId = req.query.id;
      console.log('Request query:', req.query); // Debug log
      console.log('Enrollment ID received:', enrollmentId); // Debug log
      
      if (!enrollmentId) {
        return res.status(400).json({ error: "Enrollment ID is required" });
      }

      // Get enrollment details first
      const enrollmentResult = await pool.query(
        `SELECT e.*, py.year_level
         FROM enrollments e
         JOIN program_year py ON e.year_id = py.year_id
         WHERE e.enrollment_id = $1`,
        [enrollmentId]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      const enrollment = enrollmentResult.rows[0];
      console.log('Enrollment details:', enrollment);

      // Get tuition fees with corrected query
      const feesResult = await pool.query(
        `SELECT tuition_amount, misc_fees, lab_fees, other_fees 
         FROM tuition_fees 
         WHERE program_id = $1 
         AND year_level = $2 
         AND semester = $3::varchar 
         AND academic_year = $4`,
        [
          enrollment.program_id, 
          enrollment.year_level,
          enrollment.semester.replace(/[{"}]/g, ''), // Clean the semester string
          enrollment.academic_year.replace(/[{"}]/g, '') // Clean the academic year string
        ]
      );

      console.log('Fee query params:', {
        program_id: enrollment.program_id,
        year_level: enrollment.year_level,
        semester: enrollment.semester.replace(/[{"}]/g, ''),
        academic_year: enrollment.academic_year.replace(/[{"}]/g, '')
      });

      if (feesResult.rows.length === 0) {
        return res.status(404).json({ error: "Tuition fees not configured" });
      }

      // Calculate total fees based on student type
      let totalFee;
      
      if (enrollment.student_type === 'transferee') {
        // For transferees, calculate based on assigned courses
        const assignedCoursesResult = await pool.query(
          `SELECT src.pc_id, pc.course_id, c.course_code, c.course_name, c.units
           FROM student_required_courses src
           JOIN program_course pc ON pc.pc_id = src.pc_id
           JOIN course c ON c.course_id = pc.course_id
           WHERE src.student_id = $1`,
          [enrollment.student_id]
        );

        const assignedCourses = assignedCoursesResult.rows;
        const totalUnits = assignedCourses.reduce((sum, course) => sum + parseFloat(course.units), 0);
        
        // Calculate tuition based on units (₱440 per unit)
        const tuitionAmount = totalUnits * 440;
        
        // Get miscellaneous fees from tuition_fees table
        const fees = feesResult.rows[0];
        const miscFees = parseFloat(fees.misc_fees || 0);
        const labFees = parseFloat(fees.lab_fees || 0);
        const otherFees = parseFloat(fees.other_fees || 0);
        
        totalFee = tuitionAmount + miscFees + labFees + otherFees;
        
        console.log('Transferee fee calculation:', {
          totalUnits,
          tuitionAmount,
          miscFees,
          labFees,
          otherFees,
          totalFee,
          assignedCourses: assignedCourses.length
        });
      } else {
        // For regular students, use standard fee structure
      const fees = feesResult.rows[0];
        totalFee = parseFloat(fees.tuition_amount) +
                      parseFloat(fees.misc_fees) +
                      parseFloat(fees.lab_fees) +
                      parseFloat(fees.other_fees);
        
        console.log('Regular student fee calculation:', {
          tuition_amount: fees.tuition_amount,
          misc_fees: fees.misc_fees,
          lab_fees: fees.lab_fees,
          other_fees: fees.other_fees,
          totalFee
        });
      }

      // Determine enrollment status based on student type
      // Transferees get 'Pending TOR', regular students get 'Verified'
      const enrollmentStatus = enrollment.student_type === 'transferee' ? 'Pending TOR' : 'Verified';

      // Update enrollment with fees and status
      const result = await pool.query(
        `UPDATE enrollments 
         SET enrollment_status = $1,
             total_fee = $2,
             remaining_balance = $3,
             payment_status = 'Unpaid'
         WHERE enrollment_id = $4
         RETURNING *`,
        [enrollmentStatus, totalFee, totalFee, enrollmentId]
      );
      
      console.log('Query result:', result); // Debug log

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      res.json({ 
        success: true,
        message: "Enrollment verified successfully" 
      });
    } catch (error) {
      console.error("Error verifying enrollment:", error);
      res.status(500).json({ error: "Failed to verify enrollment" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};