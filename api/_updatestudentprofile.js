// api/updatestudentprofile.js

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
    let client;
    try {
      // Verify token and get user data
      const decoded = authenticateToken(req, res);
      req.user = decoded;
      const { id } = req.user;

      console.log('Updating profile for user:', id); // Debug log
      console.log('Update data:', req.body); // Debug log

      const {
        firstName,
        middleName,
        lastName,
        suffix,
        religion,
        email,
        number,
        street_text,
        guardianName,
        guardianContactNo,
      } = req.body;

      client = await pool.connect();
      
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (suffix !== undefined) {
        updateFields.push(`suffix = $${paramCount}`);
        updateValues.push(suffix);
        paramCount++;
      }

      if (firstName) {
        updateFields.push(`first_name = $${paramCount}`);
        updateValues.push(firstName);
        paramCount++;
      }

      if (middleName) {
        updateFields.push(`middle_name = $${paramCount}`);
        updateValues.push(middleName);
        paramCount++;
      }

      if (lastName) {
        updateFields.push(`last_name = $${paramCount}`);
        updateValues.push(lastName);
        paramCount++;
      }

      if (religion) {
        updateFields.push(`religion = $${paramCount}`);
        updateValues.push(religion);
        paramCount++;
      }

      if (email) {
        updateFields.push(`email = $${paramCount}`);
        updateValues.push(email);
        paramCount++;
      }

      if (number) {
        updateFields.push(`contact_number = $${paramCount}`);
        updateValues.push(number);
        paramCount++;
      }

      if (street_text) {
        updateFields.push(`full_address = $${paramCount}`);
        updateValues.push(street_text);
        paramCount++;
      }

      if (guardianName) {
        updateFields.push(`guardian_name = $${paramCount}`);
        updateValues.push(guardianName);
        paramCount++;
      }

      if (guardianContactNo) {
        updateFields.push(`guardian_contact_no = $${paramCount}`);
        updateValues.push(guardianContactNo);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return res.status(400).send("No fields to update");
      }

      updateValues.push(id);

      const updateQuery = `
        UPDATE students 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
      `;

      await client.query(updateQuery, updateValues);

      const result = await client.query(
        `SELECT username, password, first_name, middle_name, last_name, suffix, 
                birthdate, age, place_of_birth, religion, email, 
                contact_number AS number, full_address AS street_text, 
                guardian_name, guardian_contact_no
         FROM students WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Detailed error:", {
        message: error.message,
        stack: error.stack,
        type: error.name
      });

      if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }

      res.status(500).json({ 
        error: "Server error", 
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