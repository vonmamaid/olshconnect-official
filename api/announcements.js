const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const ALLOWED_ROLES = ['admin', 'dean', 'registrar', 'finance'];
const ALLOWED_MEDIA_TYPES = new Set(['image', 'video', 'file']);

function verifyStaffToken(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
    return null;
  }
}

async function requireAnnouncementRole(req, res) {
  const decoded = verifyStaffToken(req, res);
  if (!decoded) return null;
  const client = await pool.connect();
  try {
    const r = await client.query(
      'SELECT role FROM admins WHERE staff_id = $1',
      [decoded.id]
    );
    client.release();
    if (r.rows.length === 0 || !ALLOWED_ROLES.includes(r.rows[0].role)) {
      res.status(403).json({ message: 'Access denied. Admin, Dean, Registrar, or Finance only.' });
      return null;
    }
    return { ...decoded, role: r.rows[0].role };
  } catch (e) {
    client.release();
    res.status(500).json({ message: 'Server error' });
    return null;
  }
}

module.exports = async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    if (req.method === 'GET') {
      const id = req.query.id;
      if (id) {
        const result = await client.query(
          `SELECT announcement_id, title, description, announcement_date, link, media_url, media_type, created_at, updated_at
           FROM announcements WHERE announcement_id = $1`,
          [id]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Announcement not found' });
        }
        return res.json(result.rows[0]);
      }
      const result = await client.query(
        `SELECT announcement_id, title, description, announcement_date, link, media_url, media_type, created_at
         FROM announcements ORDER BY announcement_date DESC, created_at DESC`
      );
      return res.json(result.rows);
    }

    if (req.method === 'POST') {
      const staff = await requireAnnouncementRole(req, res);
      if (!staff) return;
      const { title, description, announcement_date, link, media_url, media_type } = req.body || {};
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }
      if (media_type && !ALLOWED_MEDIA_TYPES.has(media_type)) {
        return res.status(400).json({ error: 'Invalid media_type. Allowed: image, video, file' });
      }
      const date = announcement_date || new Date().toISOString().slice(0, 10);
      const result = await client.query(
        `INSERT INTO announcements (title, description, announcement_date, link, media_url, media_type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING announcement_id, title, description, announcement_date, link, media_url, media_type, created_at`,
        [title, description, date, link || null, media_url || null, media_type || null, staff.id]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const staff = await requireAnnouncementRole(req, res);
      if (!staff) return;
      const id = req.query.id || req.body?.announcement_id;
      const { title, description, announcement_date, link, media_url, media_type } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
      }
      if (media_type !== undefined && media_type !== null && media_type !== '' && !ALLOWED_MEDIA_TYPES.has(media_type)) {
        return res.status(400).json({ error: 'Invalid media_type. Allowed: image, video, file' });
      }
      const updates = [];
      const values = [];
      let i = 1;
      if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title); }
      if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
      if (announcement_date !== undefined) { updates.push(`announcement_date = $${i++}`); values.push(announcement_date); }
      if (link !== undefined) { updates.push(`link = $${i++}`); values.push(link); }
      if (media_url !== undefined) { updates.push(`media_url = $${i++}`); values.push(media_url); }
      if (media_type !== undefined) { updates.push(`media_type = $${i++}`); values.push(media_type || null); }
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      updates.push(`updated_at = NOW()`);
      values.push(id);
      const result = await client.query(
        `UPDATE announcements SET ${updates.join(', ')} WHERE announcement_id = $${i} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      return res.json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const staff = await requireAnnouncementRole(req, res);
      if (!staff) return;
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
      }
      const result = await client.query(
        'DELETE FROM announcements WHERE announcement_id = $1 RETURNING announcement_id',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      return res.json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Announcements API error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    if (client) client.release();
  }
};
