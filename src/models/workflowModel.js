const { getDatabase } = require('../config/database');

function normalizeSpaceKind(value) {
  return String(value || '').toLowerCase();
}

function getSpaceStage(spaceKind) {
  const kind = normalizeSpaceKind(spaceKind);

  if (kind === 'auditorio') {
    return { stageCode: 'ESPACIO_DIRECCION', roleCode: 'ROL_DIRECCION' };
  }

  if (kind === 'sala 14' || kind === 'salon') {
    return { stageCode: 'ESPACIO_ACADEMICA', roleCode: 'ROL_SUBDIR_ACADEMICA' };
  }

  if (kind.includes('laboratorio')) {
    return { stageCode: 'ESPACIO_UDI', roleCode: 'ROL_UDI' };
  }

  return { stageCode: 'ESPACIO_SERVICIOS', roleCode: 'ROL_SERVICIOS_ESTUDIANTILES' };
}

function buildStages({ requesterType, spaceKind, hasExternalVisitors }) {
  const stages = [];

  if (requesterType === 'ESTUDIANTE') {
    stages.push({ stageCode: 'PROFESOR_AVAL', roleCode: 'ROL_PROFESOR' });
  }

  stages.push(getSpaceStage(spaceKind));

  if (hasExternalVisitors) {
    stages.push({ stageCode: 'EXTERNOS_ADMIN', roleCode: 'ROL_SUBDIR_ADMINISTRATIVA' });
  }

  stages.push({ stageCode: 'PUBLICACION_FINAL', roleCode: 'ROL_DIRECCION' });

  return stages;
}

async function getAssignableEventTypes() {
  const db = getDatabase();
  return db.all('SELECT id, name FROM event_types ORDER BY name ASC');
}

async function getAssignableSpaces() {
  const db = getDatabase();
  return db.all('SELECT id, name, kind FROM spaces ORDER BY name ASC');
}

async function createDraftEvent(payload) {
  const db = getDatabase();
  const {
    title,
    description,
    start,
    end,
    typeId,
    spaceId,
    organizer,
    hasExternalVisitors,
    requiresRegistration,
    createdByActorId,
    costAmount
  } = payload;

  const result = await db.run(
    `
      INSERT INTO events (
        title, description, start_datetime, end_datetime, type_id, space_id,
        organizer, status, requires_registration, has_external_visitors,
        created_by_actor_id, cost_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?, ?, ?, ?)
    `,
    [
      title,
      description,
      start,
      end,
      typeId,
      spaceId,
      organizer,
      requiresRegistration ? 1 : 0,
      hasExternalVisitors ? 1 : 0,
      createdByActorId,
      costAmount || 0
    ]
  );

  return result.lastID;
}

async function getEventById(eventId) {
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
        e.has_external_visitors AS hasExternalVisitors,
        e.requires_registration AS requiresRegistration,
        e.created_by_actor_id AS createdByActorId,
        e.cost_amount AS costAmount,
        s.id AS spaceId,
        s.name AS spaceName,
        s.kind AS spaceKind,
        t.id AS typeId,
        t.name AS typeName,
        a.actor_type AS creatorType,
        a.full_name AS creatorName
      FROM events e
      INNER JOIN spaces s ON s.id = e.space_id
      INNER JOIN event_types t ON t.id = e.type_id
      LEFT JOIN actors a ON a.id = e.created_by_actor_id
      WHERE e.id = ?
    `,
    [eventId]
  );
}

async function submitEventForReview(eventId) {
  const db = getDatabase();
  const event = await getEventById(eventId);

  if (!event) {
    throw new Error('Evento no encontrado.');
  }

  if (event.status !== 'BORRADOR') {
    throw new Error('Solo se pueden enviar eventos en BORRADOR.');
  }

  if (Number(event.costAmount) > 0) {
    throw new Error('No se permite cobrar en eventos dentro de ESCOM.');
  }

  if (event.hasExternalVisitors) {
    const diffMs = new Date(event.start).getTime() - Date.now();
    const minHours = 72;
    if (diffMs < minHours * 60 * 60 * 1000) {
      throw new Error('Eventos con externos requieren minimo 72 horas de anticipacion.');
    }
  }

  const stages = buildStages({
    requesterType: event.creatorType,
    spaceKind: event.spaceKind,
    hasExternalVisitors: Boolean(event.hasExternalVisitors)
  });

  await db.exec('BEGIN TRANSACTION');

  try {
    await db.run('DELETE FROM event_approvals WHERE event_id = ?', [eventId]);

    for (const stage of stages) {
      await db.run(
        `
          INSERT INTO event_approvals (event_id, stage_code, required_role_code, status)
          VALUES (?, ?, ?, 'PENDIENTE')
        `,
        [eventId, stage.stageCode, stage.roleCode]
      );
    }

    await db.run('UPDATE events SET status = ? WHERE id = ?', ['EN_REVISION', eventId]);

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return { eventId, stages };
}

async function getEventApprovals(eventId) {
  const db = getDatabase();
  return db.all(
    `
      SELECT id, stage_code AS stageCode, required_role_code AS requiredRoleCode, status, comments,
             decided_by_actor_id AS decidedByActorId, decided_at AS decidedAt
      FROM event_approvals
      WHERE event_id = ?
      ORDER BY id ASC
    `,
    [eventId]
  );
}

async function actorCanDecideApproval(actorId, approvalId) {
  const db = getDatabase();
  const approval = await db.get(
    `
      SELECT ea.id, ea.required_role_code AS requiredRoleCode
      FROM event_approvals ea
      WHERE ea.id = ?
    `,
    [approvalId]
  );

  if (!approval) {
    return false;
  }

  const roleMatch = await db.get(
    `
      SELECT COUNT(*) AS total
      FROM actor_roles ar
      INNER JOIN roles r ON r.id = ar.role_id
      WHERE ar.actor_id = ? AND r.code = ?
    `,
    [actorId, approval.requiredRoleCode]
  );

  return roleMatch.total > 0;
}

async function decideApproval({ approvalId, actorId, decision, comments }) {
  const db = getDatabase();
  const approval = await db.get('SELECT * FROM event_approvals WHERE id = ?', [approvalId]);

  if (!approval) {
    throw new Error('Aprobacion no encontrada.');
  }

  if (approval.status !== 'PENDIENTE') {
    throw new Error('La aprobacion ya fue decidida.');
  }

  const firstPending = await db.get(
    `
      SELECT id
      FROM event_approvals
      WHERE event_id = ? AND status = 'PENDIENTE'
      ORDER BY id ASC
      LIMIT 1
    `,
    [approval.event_id]
  );

  if (!firstPending || firstPending.id !== approval.id) {
    throw new Error('Solo se puede decidir la siguiente etapa pendiente del flujo.');
  }

  const canDecide = await actorCanDecideApproval(actorId, approvalId);
  if (!canDecide) {
    throw new Error('El actor actual no tiene rol para esta aprobacion.');
  }

  const nextStatus = decision === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';

  await db.exec('BEGIN TRANSACTION');
  try {
    await db.run(
      `
        UPDATE event_approvals
        SET status = ?, comments = ?, decided_by_actor_id = ?, decided_at = datetime('now')
        WHERE id = ?
      `,
      [nextStatus, comments || null, actorId, approvalId]
    );

    if (nextStatus === 'RECHAZADO') {
      await db.run('UPDATE events SET status = ? WHERE id = ?', ['RECHAZADO', approval.event_id]);
      await db.exec('COMMIT');
      return { rejected: true, eventId: approval.event_id };
    }

    const pending = await db.get(
      'SELECT COUNT(*) AS total FROM event_approvals WHERE event_id = ? AND status = ? ',
      [approval.event_id, 'PENDIENTE']
    );

    if (pending.total === 0) {
      await db.run('UPDATE events SET status = ? WHERE id = ?', ['PUBLICADO', approval.event_id]);
    }

    await db.exec('COMMIT');
    return { rejected: false, eventId: approval.event_id, allApproved: pending.total === 0 };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function getEventsCreatedBy(actorId) {
  const db = getDatabase();
  return db.all(
    `
      SELECT e.id, e.title, e.status, e.start_datetime AS start, s.name AS spaceName, t.name AS typeName
      FROM events e
      INNER JOIN spaces s ON s.id = e.space_id
      INNER JOIN event_types t ON t.id = e.type_id
      WHERE e.created_by_actor_id = ?
      ORDER BY e.created_at DESC
      LIMIT 40
    `,
    [actorId]
  );
}

async function getApprovalQueueForActor(actorId) {
  const db = getDatabase();
  return db.all(
    `
      SELECT
        ea.id,
        ea.stage_code AS stageCode,
        ea.status,
        e.id AS eventId,
        e.title,
        e.start_datetime AS start,
        e.status AS eventStatus,
        s.name AS spaceName,
        r.name AS requiredRoleName
      FROM event_approvals ea
      INNER JOIN events e ON e.id = ea.event_id
      INNER JOIN roles r ON r.code = ea.required_role_code
      INNER JOIN actor_roles ar ON ar.actor_id = ?
      INNER JOIN roles rr ON rr.id = ar.role_id AND rr.code = ea.required_role_code
      INNER JOIN spaces s ON s.id = e.space_id
      WHERE ea.status = 'PENDIENTE'
        AND ea.id = (
          SELECT ea2.id
          FROM event_approvals ea2
          WHERE ea2.event_id = ea.event_id AND ea2.status = 'PENDIENTE'
          ORDER BY ea2.id ASC
          LIMIT 1
        )
      ORDER BY e.start_datetime ASC
    `,
    [actorId]
  );
}

module.exports = {
  getAssignableEventTypes,
  getAssignableSpaces,
  createDraftEvent,
  submitEventForReview,
  getEventById,
  getEventApprovals,
  decideApproval,
  getEventsCreatedBy,
  getApprovalQueueForActor
};
