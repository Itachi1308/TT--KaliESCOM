const { getDatabase } = require('../config/database');

function normalizeFilters(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getEvents(filters = {}) {
  const db = getDatabase();
  const typeFilters = normalizeFilters(filters.types);
  const spaceFilters = normalizeFilters(filters.spaces);

  let query = `
    SELECT
      e.id,
      e.title,
      e.description,
      e.start_datetime AS start,
      e.end_datetime AS end,
      e.organizer,
      e.status,
      e.requires_registration AS requiresRegistration,
      e.has_external_visitors AS hasExternalVisitors,
      t.code AS typeCode,
      t.name AS typeName,
      t.color AS color,
      s.name AS spaceName,
      s.kind AS spaceKind,
      s.capacity AS capacity
    FROM events e
    INNER JOIN event_types t ON e.type_id = t.id
    INNER JOIN spaces s ON e.space_id = s.id
    WHERE e.status = 'PUBLICADO'
  `;

  const params = [];

  if (typeFilters.length > 0) {
    query += ` AND LOWER(t.name) IN (${typeFilters.map(() => '?').join(', ')})`;
    params.push(...typeFilters.map((value) => value.toLowerCase()));
  }

  if (spaceFilters.length > 0) {
    query += ` AND LOWER(s.kind) IN (${spaceFilters.map(() => '?').join(', ')})`;
    params.push(...spaceFilters.map((value) => value.toLowerCase()));
  }

  query += ' ORDER BY e.start_datetime ASC';

  return db.all(query, params);
}

async function getFilterOptions() {
  const db = getDatabase();

  const types = await db.all('SELECT name FROM event_types ORDER BY name ASC');
  const spaces = await db.all('SELECT DISTINCT kind FROM spaces ORDER BY kind ASC');

  return {
    types: types.map((row) => row.name),
    spaces: spaces.map((row) => row.kind)
  };
}

async function getUpcoming(limit = 12) {
  const db = getDatabase();

  return db.all(
    `
      SELECT
        e.id,
        e.title,
        e.start_datetime AS start,
        e.end_datetime AS end,
        t.name AS typeName,
        t.color AS color,
        s.name AS spaceName
      FROM events e
      INNER JOIN event_types t ON e.type_id = t.id
      INNER JOIN spaces s ON e.space_id = s.id
      WHERE e.status = 'PUBLICADO'
      ORDER BY e.start_datetime ASC
      LIMIT ?
    `,
    [limit]
  );
}

async function getById(eventId) {
  const db = getDatabase();
  return db.get(
    `
      SELECT
        e.id,
        e.title,
        e.description,
        e.start_datetime AS start,
        e.end_datetime AS end,
        e.organizer,
        e.status,
        e.requires_registration AS requiresRegistration,
        e.has_external_visitors AS hasExternalVisitors,
        e.cost_amount AS costAmount,
        t.code AS typeCode,
        t.name AS typeName,
        t.color AS color,
        s.name AS spaceName,
        s.kind AS spaceKind,
        s.capacity AS capacity
      FROM events e
      INNER JOIN event_types t ON e.type_id = t.id
      INNER JOIN spaces s ON e.space_id = s.id
      WHERE e.id = ?
    `,
    [eventId]
  );
}

module.exports = {
  getEvents,
  getFilterOptions,
  getUpcoming,
  getById,
  createEvent,
  updateEvent,
  deleteEvent
};

async function createEvent(event) {
  const db = getDatabase();
  const result = await db.run(
    `INSERT INTO events (
      title, description, start_datetime, end_datetime, type_id, space_id,
      organizer, status, requires_registration, has_external_visitors,
      created_by_actor_id, cost_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.title,
      event.description || null,
      event.start,
      event.end,
      event.typeId,
      event.spaceId,
      event.organizer || 'Desconocido',
      event.status || 'BORRADOR',
      event.requiresRegistration ? 1 : 0,
      event.hasExternal ? 1 : 0,
      event.createdByActorId || null,
      event.costAmount || 0
    ]
  );

  return getById(result.lastID);
}

async function updateEvent(eventId, updates) {
  const db = getDatabase();

  const existing = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
  if (!existing) {
    return null;
  }

  const merged = {
    title: updates.title ?? existing.title,
    description: updates.description ?? existing.description,
    start: updates.start ?? existing.start_datetime,
    end: updates.end ?? existing.end_datetime,
    typeId: updates.typeId ?? existing.type_id,
    spaceId: updates.spaceId ?? existing.space_id,
    organizer: updates.organizer ?? existing.organizer,
    status: updates.status ?? existing.status,
    requiresRegistration: updates.requiresRegistration !== undefined ? (updates.requiresRegistration ? 1 : 0) : existing.requires_registration,
    hasExternal: updates.hasExternal !== undefined ? (updates.hasExternal ? 1 : 0) : existing.has_external_visitors,
    costAmount: updates.costAmount ?? existing.cost_amount
  };

  await db.run(
    `UPDATE events SET
      title = ?, description = ?, start_datetime = ?, end_datetime = ?, type_id = ?, space_id = ?,
      organizer = ?, status = ?, requires_registration = ?, has_external_visitors = ?, cost_amount = ?
     WHERE id = ?`,
    [
      merged.title,
      merged.description,
      merged.start,
      merged.end,
      merged.typeId,
      merged.spaceId,
      merged.organizer,
      merged.status,
      merged.requiresRegistration,
      merged.hasExternal,
      merged.costAmount,
      eventId
    ]
  );

  return getById(eventId);
}

async function deleteEvent(eventId) {
  const db = getDatabase();
  const res = await db.run('DELETE FROM events WHERE id = ?', [eventId]);
  return res.changes > 0;
}
