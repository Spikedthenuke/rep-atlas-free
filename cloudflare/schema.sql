CREATE TABLE IF NOT EXISTS reminder_subscription (
  id TEXT PRIMARY KEY CHECK (id = 'device'),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  weekdays TEXT NOT NULL,
  time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  last_sent_local_date TEXT
);
