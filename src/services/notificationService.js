const { getDatabase } = require('../config/database');

async function createNotification({ actorId = null, eventId = null, type = 'info', message = '' }) {
  const db = getDatabase();
  const res = await db.run(
    `INSERT INTO notifications (actor_id, event_id, type, message, is_read) VALUES (?, ?, ?, ?, 0)`,
    [actorId, eventId, type, message]
  );

  return db.get('SELECT * FROM notifications WHERE id = ?', [res.lastID]);
}

async function getNotificationsForActor(actorId, onlyUnread = false) {
  const db = getDatabase();
  const sql = `SELECT id, actor_id AS actorId, event_id AS eventId, type, message, is_read AS isRead, created_at AS createdAt FROM notifications WHERE actor_id = ?` + (onlyUnread ? ' AND is_read = 0' : '') + ' ORDER BY created_at DESC';
  return db.all(sql, [actorId]);
}

async function markAsRead(notificationId) {
  const db = getDatabase();
  await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
  return db.get('SELECT * FROM notifications WHERE id = ?', [notificationId]);
}

module.exports = {
  createNotification,
  getNotificationsForActor,
  markAsRead
};
