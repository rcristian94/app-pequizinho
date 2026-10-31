PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS parents (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'parent' CHECK(role IN ('parent','admin')),
 consent_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
 expires INTEGER NOT NULL, adult_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS children (
 id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
 nickname TEXT NOT NULL, age_band TEXT NOT NULL CHECK(age_band IN ('4-6','7-9','10-12')),
 avatar TEXT NOT NULL DEFAULT 'pequi', daily_goal INTEGER NOT NULL DEFAULT 1 CHECK(daily_goal BETWEEN 1 AND 5),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS children_parent ON children(parent_id);
-- Adaptado da hierarquia courses -> units -> lessons -> challenges do Lingo MIT.
CREATE TABLE IF NOT EXISTS lessons (
 id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, unit_title TEXT NOT NULL, title TEXT NOT NULL,
 description TEXT NOT NULL, sort_order INTEGER NOT NULL UNIQUE, published INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 1, content TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS answers (
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, revision INTEGER NOT NULL,
 challenge_index INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(child_id, lesson_id, revision, challenge_index)
);
CREATE TABLE IF NOT EXISTS progress (
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
 points INTEGER NOT NULL, stars INTEGER NOT NULL, completed_day TEXT NOT NULL,
 completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(child_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS progress_day ON progress(child_id,completed_day);
CREATE TABLE IF NOT EXISTS subscriptions (
 parent_id TEXT PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'sandbox' CHECK(status = 'sandbox'), price_cents INTEGER NOT NULL DEFAULT 990,
 currency TEXT NOT NULL DEFAULT 'BRL', billing_enabled INTEGER NOT NULL DEFAULT 0 CHECK(billing_enabled = 0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id TEXT NOT NULL, action TEXT NOT NULL, lesson_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
