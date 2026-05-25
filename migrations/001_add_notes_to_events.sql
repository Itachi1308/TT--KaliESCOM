-- Migration: Add optional notes column to events
ALTER TABLE events ADD COLUMN notes TEXT;

-- Example: create a lightweight audit table for registrations
CREATE TABLE IF NOT EXISTS registration_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  performed_by INTEGER,
  performed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (registration_id) REFERENCES event_registrations(id),
  FOREIGN KEY (performed_by) REFERENCES actors(id)
);
