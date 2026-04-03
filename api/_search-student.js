const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

const fullNameFromRow = (student) => {
  const middleInitial = student.middle_name ? `${student.middle_name.charAt(0)}.` : '';
  const suffix = student.suffix || '';
  return `${student.last_name}, ${student.first_name} ${middleInitial} ${suffix}`.trim();
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    authenticateToken(req);
    const searchQuery = req.query.q;

    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        s.id,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        e.enrollment_id,
        e.total_fee,
        e.amount_paid,
        e.remaining_balance,
        e.payment_status,
        e.enrollment_status,
        p.program_name
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN program p ON e.program_id = p.program_id
      WHERE e.enrollment_status IN ('Verified', 'Officially Enrolled', 'For Payment')
      AND (
        LOWER(s.first_name) LIKE LOWER($1) OR
        LOWER(s.last_name) LIKE LOWER($1) OR
        CAST(s.id AS TEXT) LIKE $1
      )
      ORDER BY e.enrollment_date DESC
      LIMIT 10
    `, [`%${searchQuery}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found or no active enrollment' });
    }

    const matchesRows = result.rows;
    const enrollmentIds = matchesRows.map((r) => r.enrollment_id);

    // Get document requests pending for payment (batch by enrollment_id)
    const documentRequestsResult = await client.query(
      `SELECT 
        req_id,
        doc_type,
        document_price,
        academic_credentials,
        certification,
        description,
        enrollment_id
       FROM documentrequest
       WHERE enrollment_id = ANY($1)
       AND req_status = 'Pending for Payment'
       ORDER BY enrollment_id, req_date DESC`,
      [enrollmentIds]
    );

    const docsByEnrollmentId = {};
    for (const doc of documentRequestsResult.rows) {
      const enrollmentId = doc.enrollment_id;
      if (!docsByEnrollmentId[enrollmentId]) docsByEnrollmentId[enrollmentId] = [];
      docsByEnrollmentId[enrollmentId].push({
        req_id: doc.req_id,
        doc_type: doc.doc_type,
        price: parseFloat(doc.document_price || 0),
        academic_credentials: doc.academic_credentials,
        certification: doc.certification,
        description: doc.description
      });
    }

    const matches = matchesRows.map((student) => {
      const documentRequests = docsByEnrollmentId[student.enrollment_id] || [];
      const totalDocumentPrice = documentRequests.reduce(
        (sum, doc) => sum + doc.price,
        0
      );

      return {
        id: student.id,
        fullName: fullNameFromRow(student),
        studentId: student.id,
        program: student.program_name,
        totalFee: parseFloat(student.total_fee) || 0,
        amountPaid: parseFloat(student.amount_paid) || 0,
        balance: parseFloat(student.remaining_balance) || 0,
        enrollmentId: student.enrollment_id,
        paymentStatus: student.payment_status,
        enrollmentStatus: student.enrollment_status,
        documentRequests,
        totalDocumentPrice
      };
    });

    if (matches.length === 1) {
      return res.status(200).json({
        ...matches[0],
        matchCount: 1,
        matches
      });
    }

    return res.status(200).json({ matchCount: matches.length, matches });

  } catch (error) {
    console.error('Error searching student:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error searching student: ' + error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};