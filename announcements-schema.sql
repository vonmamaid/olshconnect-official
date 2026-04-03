-- Run this SQL in your database to create the announcements table.
-- Required for the Announcements panel (admin, dean, registrar, finance).

CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  announcement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  link VARCHAR(500),
  media_url VARCHAR(1000),
  media_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES admins(staff_id)
);

-- Backward-compatible updates for existing databases
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS media_url VARCHAR(1000);

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);

ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_media_type_check;

ALTER TABLE announcements
  ADD CONSTRAINT announcements_media_type_check
  CHECK (media_type IN ('image', 'video', 'file') OR media_type IS NULL);

-- Optional: index for listing by date
CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(announcement_date DESC);
