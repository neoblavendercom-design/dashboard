// Setup/migration endpoint - creates tables and seeds data
// This is a public endpoint used for local development setup
// In production, use wrangler d1 migrations

export async function onRequestPost(context) {
  const { env } = context;

  try {
    // Create tables
    const statements = [
      `CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT)`,
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT, display_name TEXT NOT NULL, role_id INTEGER REFERENCES roles(id), is_admin INTEGER DEFAULT 0, google_sub TEXT UNIQUE, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME)`,
      `CREATE TABLE IF NOT EXISTS apps (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, description TEXT, icon TEXT, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS app_roles (app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE, role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY (app_id, role_id))`,
      `CREATE TABLE IF NOT EXISTS user_app_prefs (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE, open_new_tab INTEGER DEFAULT 1, PRIMARY KEY (user_id, app_id))`,
      `CREATE TABLE IF NOT EXISTS game_plays (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), game_key TEXT NOT NULL, score INTEGER NOT NULL, accuracy REAL, grade TEXT, played_at DATETIME DEFAULT CURRENT_TIMESTAMP, play_date DATE NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT, icon TEXT, category TEXT)`,
      `CREATE TABLE IF NOT EXISTS user_achievements (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE, earned_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, achievement_id))`,
      `CREATE TABLE IF NOT EXISTS login_streaks (user_id INTEGER PRIMARY KEY REFERENCES users(id), current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0, last_login_date DATE)`,
      `CREATE TABLE IF NOT EXISTS app_launches (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), app_id INTEGER REFERENCES apps(id), launched_at DATETIME DEFAULT CURRENT_TIMESTAMP, launch_date DATE NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT)`,
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, token TEXT UNIQUE NOT NULL, expires_at DATETIME NOT NULL, used INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE INDEX IF NOT EXISTS idx_game_plays_user_date ON game_plays(user_id, play_date)`,
      `CREATE INDEX IF NOT EXISTS idx_game_plays_user_game ON game_plays(user_id, game_key)`,
      `CREATE INDEX IF NOT EXISTS idx_app_launches_user_date ON app_launches(user_id, launch_date)`,
      `CREATE INDEX IF NOT EXISTS idx_app_launches_user_app ON app_launches(user_id, app_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)`,
    ];

    for (const sql of statements) {
      await env.DB.prepare(sql).run();
    }

    // Seed data
    await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES ('daily_game_limit', '2', 'Max games a user can play per day')`).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES ('game_duration_seconds', '60', 'Default max game duration in seconds')`).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES ('games_enabled', 'true', 'Master toggle for the games system')`).run();

    // Achievements
    const achievements = [
      ['first_steps', 'First Steps', 'Log in for the first time', '👋', 'Login'],
      ['regular', 'Regular', 'Log in 7 days in a row', '📅', 'Login'],
      ['dedicated', 'Dedicated', 'Log in 30 days in a row', '🏆', 'Login'],
      ['early_bird', 'Early Bird', 'Log in before 7:00 AM', '🌅', 'Login'],
      ['night_owl', 'Night Owl', 'Log in after 9:00 PM', '🦉', 'Login'],
      ['first_game', 'First Game', 'Play your first mini-game', '🎮', 'Games'],
      ['high_score', 'High Score', 'Score 200+ in any game', '⭐', 'Games'],
      ['s_rank', 'S-Rank', 'Score 500+ in any game', '💎', 'Games'],
      ['sharpshooter', 'Sharpshooter', '100% accuracy in any game', '🎯', 'Games'],
      ['combo_king', 'Combo King', 'Achieve a 5x combo in any game', '🔥', 'Games'],
      ['well_rounded', 'Well Rounded', 'Play all 5 different games', '🎲', 'Games'],
      ['daily_double', 'Daily Double', 'Use both daily plays in one day', '✌️', 'Games'],
      ['five_day_player', 'Five-Day Player', 'Play games on 5 different days', '📆', 'Games'],
      ['explorer', 'Explorer', 'Launch 5 different apps in one day', '🧭', 'Dashboard'],
      ['navigator', 'Navigator', 'Launch every app assigned to your role', '🗺️', 'Dashboard'],
      ['creature_of_habit', 'Creature of Habit', 'Launch the same app 10 days in a row', '🔁', 'Dashboard'],
    ];
    for (const [key, name, desc, icon, cat] of achievements) {
      await env.DB.prepare('INSERT OR IGNORE INTO achievements (key, name, description, icon, category) VALUES (?, ?, ?, ?, ?)').bind(key, name, desc, icon, cat).run();
    }

    // Roles
    const roles = [
      ['All', 'Access to all applications'],
      ['Warehouse', 'Warehouse and inventory team'],
      ['Support', 'Customer support team'],
      ['HR', 'Human resources team'],
      ['Shifts', 'Shift workers'],
    ];
    for (const [name, desc] of roles) {
      await env.DB.prepare('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)').bind(name, desc).run();
    }

    // Admin user (password: admin123)
    await env.DB.prepare(
      `INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role_id, is_admin) VALUES ('admin', 'admin@company.com', '$2a$10$rQEY0tEMO9QmEGarGMUJR.0v.LqoKvnNkOGH4cD/L0EL8hBMi6Dci', 'Admin User', 1, 1)`
    ).run();

    // Sample apps
    const apps = [
      ['Inventory Manager', 'https://inventory.company.com', 'Manage warehouse inventory and stock levels', '📦', 1],
      ['Help Desk', 'https://helpdesk.company.com', 'Customer support ticket system', '🎫', 2],
      ['Time Tracker', 'https://time.company.com', 'Log work hours and manage timesheets', '⏰', 3],
      ['HR Portal', 'https://hr.company.com', 'Employee information and benefits', '👥', 4],
      ['Shift Planner', 'https://shifts.company.com', 'View and manage shift schedules', '📋', 5],
      ['Reports', 'https://reports.company.com', 'Business reports and analytics', '📊', 6],
      ['Team Chat', 'https://chat.company.com', 'Internal messaging and collaboration', '💬', 7],
      ['Knowledge Base', 'https://wiki.company.com', 'Internal documentation and guides', '📚', 8],
    ];
    for (const [name, url, desc, icon, order] of apps) {
      await env.DB.prepare('INSERT OR IGNORE INTO apps (name, url, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)').bind(name, url, desc, icon, order).run();
    }

    // App-role assignments
    const appRoles = [
      [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],
      [1,2],[3,2],[7,2],
      [2,3],[3,3],[7,3],[8,3],
      [4,4],[3,4],[7,4],
      [5,5],[3,5],[7,5],
    ];
    for (const [appId, roleId] of appRoles) {
      await env.DB.prepare('INSERT OR IGNORE INTO app_roles (app_id, role_id) VALUES (?, ?)').bind(appId, roleId).run();
    }

    return new Response(JSON.stringify({ success: true, message: 'Database setup complete!' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
