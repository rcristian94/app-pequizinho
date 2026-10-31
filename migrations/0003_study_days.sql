CREATE TABLE IF NOT EXISTS study_activity (
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
 study_day TEXT NOT NULL,
 PRIMARY KEY(child_id, lesson_id, study_day)
);
INSERT OR IGNORE INTO study_activity(child_id,lesson_id,study_day)
 SELECT child_id,lesson_id,completed_day FROM progress;
CREATE INDEX IF NOT EXISTS study_activity_day ON study_activity(child_id,study_day);
