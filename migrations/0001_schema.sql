-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  is_admin INTEGER DEFAULT 0,
  google_sub TEXT UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Apps
CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App-Role junction
CREATE TABLE IF NOT EXISTS app_roles (
  app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (app_id, role_id)
);

-- User per-app preferences
CREATE TABLE IF NOT EXISTS user_app_prefs (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
  open_new_tab INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, app_id)
);

-- Game play records
CREATE TABLE IF NOT EXISTS game_plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  game_key TEXT NOT NULL,
  score INTEGER NOT NULL,
  accuracy REAL,
  grade TEXT,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  play_date DATE NOT NULL
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT
);

-- User-Achievement junction
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id)
);

-- Login streaks
CREATE TABLE IF NOT EXISTS login_streaks (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE
);

-- App launch tracking (for badges)
CREATE TABLE IF NOT EXISTS app_launches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  app_id INTEGER REFERENCES apps(id),
  launched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  launch_date DATE NOT NULL
);

-- Admin-configurable settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_plays_user_date ON game_plays(user_id, play_date);
CREATE INDEX IF NOT EXISTS idx_game_plays_user_game ON game_plays(user_id, game_key);
CREATE INDEX IF NOT EXISTS idx_app_launches_user_date ON app_launches(user_id, launch_date);
CREATE INDEX IF NOT EXISTS idx_app_launches_user_app ON app_launches(user_id, app_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
