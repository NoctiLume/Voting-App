-- Initial database schema for voting app

CREATE TABLE IF NOT EXISTS candidates (
  calonId TEXT PRIMARY KEY,
  nama TEXT,
  visiMisi TEXT,
  photoPath TEXT,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS votes (
  calonId TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Initialize vote counts for all candidates
INSERT OR IGNORE INTO votes (calonId, count) VALUES ('calon1', 0);
INSERT OR IGNORE INTO votes (calonId, count) VALUES ('calon2', 0);
INSERT OR IGNORE INTO votes (calonId, count) VALUES ('calon3', 0);
INSERT OR IGNORE INTO votes (calonId, count) VALUES ('calon4', 0);

