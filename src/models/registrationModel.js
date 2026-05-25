const { getDatabase } = require('../config/database');

async function getPublishedEventById(eventId) {
  const db = getDatabase();
  return db.get(
    `
      SELECT
        e.id,
        e.title,
        e.start_datetime AS start,
        e.end_datetime AS end,
        e.status,
        s.name AS spaceName,
        s.capacity AS capacity
      FROM events e
      INNER JOIN spaces s ON s.id = e.space_id
      WHERE e.id = ? AND e.status = 'PUBLICADO'
    `,
    [eventId]
  );
}

function normalizeValue(value) {
  const text = String(value || '').trim();
  return text.length > 0 ? text : null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isInstitutionalEmail(value) {
  return /@[^\s@]*ipn\.mx$/i.test(String(value || '').trim());
}

async function findExistingRegistrationForPerson(eventId, actorId, payload) {
  const db = getDatabase();
  const clauses = [];
  const params = [eventId];

  const credentialQrToken = normalizeValue(payload.credentialQrToken);
  const curp = normalizeValue(payload.curp);
  const boleta = normalizeValue(payload.boleta);
  const employeeNumber = normalizeValue(payload.employeeNumber);
  const institutionalEmail = normalizeValue(payload.institutionalEmail);
  const personalEmail = normalizeValue(payload.personalEmail || payload.email);

  if (credentialQrToken) {
    clauses.push('LOWER(credential_qr_token) = LOWER(?)');
    params.push(credentialQrToken);
  }

  if (curp) {
    clauses.push('LOWER(curp) = LOWER(?)');
    params.push(curp);
  }

  if (boleta) {
    clauses.push('LOWER(boleta) = LOWER(?)');
    params.push(boleta);
  }

  if (employeeNumber) {
    clauses.push('LOWER(employee_number) = LOWER(?)');
    params.push(employeeNumber);
  }

  if (institutionalEmail) {
    clauses.push('LOWER(email) = LOWER(?)');
    params.push(institutionalEmail);
  }

  if (personalEmail) {
    clauses.push('LOWER(personal_email) = LOWER(?)');
    params.push(personalEmail);
  }

  if (clauses.length === 0) {
    return null;
  }

  const match = await db.get(
    `
      SELECT *
      FROM event_registrations
      WHERE event_id = ?
        AND (${clauses.join(' OR ')})
      ORDER BY created_at ASC
      LIMIT 1
    `,
    params
  );

  return match;
}

async function getConfirmedCount(eventId) {
  const db = getDatabase();
  const row = await db.get(
    'SELECT COUNT(*) AS total FROM event_registrations WHERE event_id = ? AND status = ?',
    [eventId, 'CONFIRMADO']
  );
  return row.total;
}

function validateRegistrationInput(payload) {
  const personType = String(payload.personType || '').toUpperCase();
  const sexo = String(payload.sexo || '').toUpperCase();
  const institutionalEmail = normalizeValue(payload.institutionalEmail);
  const personalEmail = normalizeValue(payload.personalEmail || payload.email);

  const missingFields = [];
  if (!payload.fullName) missingFields.push('nombre completo');
  // institutionalEmail is optional if user only provides a personal/contact email
  if (!personalEmail) missingFields.push('correo personal');
  if (!personType) missingFields.push('tipo de persona');
  if (!sexo) missingFields.push('sexo');
  if (!payload.semestre) missingFields.push('semestre');

  if (missingFields.length > 0) {
    throw new Error(`Faltan datos obligatorios para el registro: ${missingFields.join(', ')}.`);
  }

  if (!isValidEmail(personalEmail) || (institutionalEmail && !isValidEmail(institutionalEmail))) {
    throw new Error('Los correos deben tener un formato valido con @.');
  }

  if (institutionalEmail && !isInstitutionalEmail(institutionalEmail)) {
    throw new Error('El correo institucional debe terminar en ipn.mx.');
  }

  const allowedTypes = ['ALUMNO', 'DOCENTE', 'EXTERNO'];
  if (!allowedTypes.includes(personType)) {
    throw new Error('Tipo de persona invalido.');
  }

  const allowedSex = ['HOMBRE', 'MUJER', 'PREFIERO_NO_DECIR'];
  if (!allowedSex.includes(sexo)) {
    throw new Error('Valor de sexo invalido.');
  }

  if (personType === 'ALUMNO' && !payload.boleta) {
    throw new Error('Para alumno, la boleta es obligatoria.');
  }

  if (personType === 'ALUMNO' && !payload.carrera) {
    throw new Error('Para alumno, la carrera es obligatoria.');
  }

  if (personType === 'ALUMNO' && !payload.turno) {
    throw new Error('Para alumno, el turno es obligatorio.');
  }

  if (personType === 'ALUMNO' && !payload.escuela) {
    throw new Error('Para alumno, la escuela es obligatoria.');
  }

  if (personType === 'DOCENTE' && !payload.employeeNumber) {
    throw new Error('Para docente, el numero de empleado es obligatorio.');
  }

  if (personType === 'DOCENTE' && !payload.escuela) {
    throw new Error('Para docente, la escuela es obligatoria.');
  }

  if (personType === 'EXTERNO' && !payload.procedencia) {
    throw new Error('Para externo, la procedencia es obligatoria.');
  }

  if (personType !== 'ALUMNO' && !payload.participantRole) {
    throw new Error('Debes seleccionar un rol en el evento.');
  }

  if (personType === 'ALUMNO' && String(payload.participantRole || '').toUpperCase() !== 'OBSERVADOR') {
    throw new Error('El alumno solo puede registrarse como observador.');
  }
}

async function hasOverlap(email, start, end) {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT COUNT(*) AS total
      FROM event_registrations er
      INNER JOIN events e ON e.id = er.event_id
      WHERE LOWER(er.email) = LOWER(?)
        AND er.status = 'CONFIRMADO'
        AND e.status = 'PUBLICADO'
        AND e.start_datetime < ?
        AND e.end_datetime > ?
    `,
    [email, end, start]
  );

  return row.total > 0;
}

async function registerToEvent({ eventId, actorId, payload }) {
  if (String(payload.personType || '').toUpperCase() === 'ALUMNO') {
    payload.participantRole = 'OBSERVADOR';
  }

  validateRegistrationInput(payload);

  const event = await getPublishedEventById(eventId);
  if (!event) {
    throw new Error('Evento no disponible para registro.');
  }

  const institutionalEmail = normalizeValue(payload.institutionalEmail);
  const personalEmail = normalizeValue(payload.personalEmail || payload.email);
  payload.email = personalEmail || institutionalEmail;
  payload.institutionalEmail = institutionalEmail;
  payload.personalEmail = personalEmail;

  const existingRegistration = await findExistingRegistrationForPerson(eventId, actorId, payload);
  if (existingRegistration) {
    throw new Error('Esta persona ya está registrada en el evento.');
  }

  const overlap = await hasOverlap(payload.email, event.start, event.end);
  if (overlap) {
    throw new Error('Existe empalme con otro evento confirmado para este correo.');
  }

  const db = getDatabase();
  const confirmed = await getConfirmedCount(eventId);
  const status = confirmed >= Number(event.capacity) ? 'ESPERA' : 'CONFIRMADO';
  const credentialQrInput = normalizeValue(payload.credentialQrInput);
  const credentialQrUrl = normalizeValue(payload.credentialQrUrl);
  const credentialQrToken = normalizeValue(payload.credentialQrToken);
  const curp = normalizeValue(payload.curp);
  const escuela = normalizeValue(payload.escuela);
  const turno = normalizeValue(payload.turno);
  const curpAge = payload.curpAge || null;
  const curpBirthplace = payload.curpBirthplace || null;
  const curpBirthDate = payload.curpBirthDate ? payload.curpBirthDate.toISOString().split('T')[0] : null;

  try {
    await db.run(
      `
        INSERT INTO event_registrations (
          event_id, actor_id, person_type, full_name, email, institutional_email, personal_email, boleta,
          employee_number, procedencia, carrera, semestre, curp, escuela, turno,
          credential_qr_url, credential_qr_token, sexo, participant_role, team_name,
          curp_age, curp_birthplace, curp_birth_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventId,
        actorId,
        String(payload.personType).toUpperCase(),
        payload.fullName,
        payload.email,
        institutionalEmail,
        personalEmail,
        payload.boleta || null,
        payload.employeeNumber || null,
        payload.procedencia || null,
        payload.carrera || null,
        payload.semestre || null,
        curp,
        escuela,
        turno,
        credentialQrUrl,
        credentialQrToken,
        String(payload.sexo).toUpperCase(),
        payload.participantRole,
        payload.teamName || null,
        curpAge,
        curpBirthplace,
        curpBirthDate,
        status
      ]
    );
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE constraint failed')) {
      throw new Error('Este correo ya esta registrado en el evento.');
    }
    throw error;
  }

  let waitlistPosition = null;
  if (status === 'ESPERA') {
    const row = await db.get(
      'SELECT COUNT(*) AS total FROM event_registrations WHERE event_id = ? AND status = ?',
      [eventId, 'ESPERA']
    );
    waitlistPosition = row.total;
  }

  return {
    status,
    waitlistPosition,
    event
  };
}

async function findRegistrationByCredential(eventId, credential) {
  const db = getDatabase();
  const clauses = [];
  const params = [eventId];

  if (credential && credential.credentialQrToken) {
    clauses.push('credential_qr_token = ?');
    params.push(String(credential.credentialQrToken).trim());
  }

  if (credential && credential.boleta) {
    clauses.push('LOWER(boleta) = LOWER(?)');
    params.push(String(credential.boleta).trim());
  }

  if (credential && credential.employeeNumber) {
    clauses.push('LOWER(employee_number) = LOWER(?)');
    params.push(String(credential.employeeNumber).trim());
  }

  if (credential && credential.email) {
    clauses.push('LOWER(email) = LOWER(?)');
    params.push(String(credential.email).trim());
  }

  if (clauses.length === 0) {
    return null;
  }

  return db.get(
    `
      SELECT *
      FROM event_registrations
      WHERE event_id = ?
        AND (${clauses.join(' OR ')})
      ORDER BY created_at ASC
      LIMIT 1
    `,
    params
  );
}

async function getMyRegistrations(actorId) {
  const db = getDatabase();
  return db.all(
    `
      SELECT
        er.id,
        er.full_name AS fullName,
        er.email,
        er.institutional_email AS institutionalEmail,
        er.personal_email AS personalEmail,
        er.person_type AS personType,
        er.status,
        er.participant_role AS participantRole,
        er.checkin_at AS checkinAt,
        er.checkout_at AS checkoutAt,
        e.id AS eventId,
        e.title,
        e.start_datetime AS start,
        e.end_datetime AS end,
        s.name AS spaceName
      FROM event_registrations er
      INNER JOIN events e ON e.id = er.event_id
      INNER JOIN spaces s ON s.id = e.space_id
      WHERE er.actor_id = ?
      ORDER BY e.start_datetime DESC
    `,
    [actorId]
  );
}

async function getEventReport(eventId) {
  const db = getDatabase();

  const event = await db.get(
    `
      SELECT e.id, e.title, e.start_datetime AS start, e.end_datetime AS end,
             s.name AS spaceName, s.capacity
      FROM events e
      INNER JOIN spaces s ON s.id = e.space_id
      WHERE e.id = ?
    `,
    [eventId]
  );

  if (!event) {
    return null;
  }

  const totals = await db.get(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmados,
        SUM(CASE WHEN status = 'ESPERA' THEN 1 ELSE 0 END) AS espera,
        SUM(CASE WHEN checkin_at IS NOT NULL THEN 1 ELSE 0 END) AS conEntrada,
        SUM(CASE WHEN checkout_at IS NOT NULL THEN 1 ELSE 0 END) AS conSalida
      FROM event_registrations
      WHERE event_id = ?
    `,
    [eventId]
  );

  const bySexo = await db.all(
    `
      SELECT sexo, COUNT(*) AS total
      FROM event_registrations
      WHERE event_id = ?
      GROUP BY sexo
      ORDER BY total DESC
    `,
    [eventId]
  );

  const byCarrera = await db.all(
    `
      SELECT COALESCE(carrera, 'No especificada') AS carrera, COUNT(*) AS total
      FROM event_registrations
      WHERE event_id = ?
      GROUP BY carrera
      ORDER BY total DESC
    `,
    [eventId]
  );

  const byProcedencia = await db.all(
    `
      SELECT
        CASE
          WHEN UPPER(COALESCE(escuela, '')) LIKE '%ESCOM%' THEN 'ESCOM'
          WHEN UPPER(COALESCE(escuela, '')) LIKE '%IPN%' THEN 'IPN'
          WHEN person_type = 'EXTERNO' THEN 'EXTERNO'
          ELSE 'Sin especificar'
        END AS categoria,
        CASE
          WHEN UPPER(COALESCE(escuela, '')) LIKE '%ESCOM%' THEN 'ESCOM'
          WHEN UPPER(COALESCE(escuela, '')) LIKE '%IPN%' THEN COALESCE(escuela, 'No especificada')
          WHEN person_type = 'EXTERNO' THEN COALESCE(procedencia, 'No especificada')
          ELSE COALESCE(escuela, procedencia, 'No especificada')
        END AS institucion,
        COUNT(*) AS total
      FROM event_registrations
      WHERE event_id = ?
      GROUP BY categoria, institucion
      ORDER BY total DESC
    `,
    [eventId]
  );

  const registrations = await db.all(
    `
      SELECT id, full_name AS fullName, email, institutional_email AS institutionalEmail, personal_email AS personalEmail, person_type AS personType,
             participant_role AS participantRole, status,
             checkin_at AS checkinAt, checkout_at AS checkoutAt
      FROM event_registrations
      WHERE event_id = ?
      ORDER BY created_at ASC
    `,
    [eventId]
  );

  return {
    event,
    totals: {
      total: totals.total || 0,
      confirmados: totals.confirmados || 0,
      espera: totals.espera || 0,
      conEntrada: totals.conEntrada || 0,
      conSalida: totals.conSalida || 0,
      porcentajeEntrada: totals.confirmados ? Math.round(((totals.conEntrada || 0) / totals.confirmados) * 100) : 0
    },
    bySexo,
    byCarrera,
    byProcedencia,
    registrations
  };
}

async function markCheckin(registrationId) {
  const db = getDatabase();
  await db.run(
    `UPDATE event_registrations
     SET checkin_at = COALESCE(checkin_at, datetime('now'))
     WHERE id = ?`,
    [registrationId]
  );
}

async function markCheckinByCredential(eventId, credential) {
  const registration = await findRegistrationByCredential(eventId, credential);
  if (!registration) {
    throw new Error('No se encontro una asistencia asociada a esa credencial.');
  }

  await markCheckin(registration.id);
  return registration;
}

async function markCheckout(registrationId) {
  const db = getDatabase();
  await db.run(
    `UPDATE event_registrations
     SET checkout_at = COALESCE(checkout_at, datetime('now'))
     WHERE id = ?`,
    [registrationId]
  );
}

async function markCheckoutByCredential(eventId, credential) {
  const registration = await findRegistrationByCredential(eventId, credential);
  if (!registration) {
    throw new Error('No se encontro una asistencia asociada a esa credencial.');
  }

  await markCheckout(registration.id);
  return registration;
}

async function getPublishedEventsSimple() {
  const db = getDatabase();
  return db.all(
    `
      SELECT e.id, e.title, e.start_datetime AS start
      FROM events e
      WHERE e.status = 'PUBLICADO'
      ORDER BY e.start_datetime DESC
    `
  );
}

module.exports = {
  getPublishedEventById,
  registerToEvent,
  getMyRegistrations,
  getEventReport,
  findRegistrationByCredential,
  markCheckin,
  markCheckinByCredential,
  markCheckout,
  markCheckoutByCredential,
  getPublishedEventsSimple
};
