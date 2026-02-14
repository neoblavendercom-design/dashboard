-- Default settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('daily_game_limit', '2', 'Max games a user can play per day'),
  ('game_duration_seconds', '60', 'Default max game duration in seconds'),
  ('games_enabled', 'true', 'Master toggle for the games system');

-- Achievement definitions
INSERT OR IGNORE INTO achievements (key, name, description, icon, category) VALUES
  ('first_steps', 'First Steps', 'Log in for the first time', '👋', 'Login'),
  ('regular', 'Regular', 'Log in 7 days in a row', '📅', 'Login'),
  ('dedicated', 'Dedicated', 'Log in 30 days in a row', '🏆', 'Login'),
  ('early_bird', 'Early Bird', 'Log in before 7:00 AM', '🌅', 'Login'),
  ('night_owl', 'Night Owl', 'Log in after 9:00 PM', '🦉', 'Login'),
  ('first_game', 'First Game', 'Play your first mini-game', '🎮', 'Games'),
  ('high_score', 'High Score', 'Score 200+ in any game', '⭐', 'Games'),
  ('s_rank', 'S-Rank', 'Score 500+ in any game', '💎', 'Games'),
  ('sharpshooter', 'Sharpshooter', '100% accuracy in any game', '🎯', 'Games'),
  ('combo_king', 'Combo King', 'Achieve a 5x combo in any game', '🔥', 'Games'),
  ('well_rounded', 'Well Rounded', 'Play all 5 different games', '🎲', 'Games'),
  ('daily_double', 'Daily Double', 'Use both daily plays in one day', '✌️', 'Games'),
  ('five_day_player', 'Five-Day Player', 'Play games on 5 different days', '📆', 'Games'),
  ('explorer', 'Explorer', 'Launch 5 different apps in one day', '🧭', 'Dashboard'),
  ('navigator', 'Navigator', 'Launch every app assigned to your role', '🗺️', 'Dashboard'),
  ('creature_of_habit', 'Creature of Habit', 'Launch the same app 10 days in a row', '🔁', 'Dashboard');

-- Default roles
INSERT OR IGNORE INTO roles (name, description) VALUES
  ('All', 'Access to all applications'),
  ('Warehouse', 'Warehouse and inventory team'),
  ('Support', 'Customer support team'),
  ('HR', 'Human resources team'),
  ('Shifts', 'Shift workers');

-- Default admin user (password: admin123)
-- bcrypt hash for 'admin123': $2a$10$rQEY0tEMO9QmEGarGMUJR.0v.LqoKvnNkOGH4cD/L0EL8hBMi6Dci
INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role_id, is_admin)
VALUES ('admin', 'admin@company.com', '$2a$10$rQEY0tEMO9QmEGarGMUJR.0v.LqoKvnNkOGH4cD/L0EL8hBMi6Dci', 'Admin User', 1, 1);

-- Sample apps
INSERT OR IGNORE INTO apps (name, url, description, icon, sort_order) VALUES
  ('Inventory Manager', 'https://inventory.company.com', 'Manage warehouse inventory and stock levels', '📦', 1),
  ('Help Desk', 'https://helpdesk.company.com', 'Customer support ticket system', '🎫', 2),
  ('Time Tracker', 'https://time.company.com', 'Log work hours and manage timesheets', '⏰', 3),
  ('HR Portal', 'https://hr.company.com', 'Employee information and benefits', '👥', 4),
  ('Shift Planner', 'https://shifts.company.com', 'View and manage shift schedules', '📋', 5),
  ('Reports', 'https://reports.company.com', 'Business reports and analytics', '📊', 6),
  ('Team Chat', 'https://chat.company.com', 'Internal messaging and collaboration', '💬', 7),
  ('Knowledge Base', 'https://wiki.company.com', 'Internal documentation and guides', '📚', 8);

-- App-role assignments (role 1 = All gets everything)
INSERT OR IGNORE INTO app_roles (app_id, role_id) VALUES
  (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1), (7, 1), (8, 1),
  (1, 2), (3, 2), (7, 2),  -- Warehouse: Inventory, Time, Chat
  (2, 3), (3, 3), (7, 3), (8, 3),  -- Support: Help Desk, Time, Chat, KB
  (4, 4), (3, 4), (7, 4),  -- HR: HR Portal, Time, Chat
  (5, 5), (3, 5), (7, 5);  -- Shifts: Shift Planner, Time, Chat
