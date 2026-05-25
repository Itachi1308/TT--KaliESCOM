const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let database;

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'escom_eventos.db');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function dateAt(dayOffset, startHour, endHour) {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    startHour,
    0,
    0,
    0
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    endHour,
    0,
    0,
    0
  );

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function buildSeedData() {
  const organizationalUnits = [
    { id: 1, name: 'Direccion', parentId: null, unitType: 'DIRECCION' },
    { id: 2, name: 'Subdireccion Academica', parentId: 1, unitType: 'SUBDIRECCION' },
    { id: 3, name: 'Subdireccion de Servicios Educativos e Integracion Social', parentId: 1, unitType: 'SUBDIRECCION' },
    { id: 4, name: 'Subdireccion Administrativa', parentId: 1, unitType: 'SUBDIRECCION' },
    { id: 5, name: 'Unidad de Informatica', parentId: 1, unitType: 'UNIDAD' },
    { id: 6, name: 'Departamento de Servicios Estudiantiles', parentId: 3, unitType: 'DEPARTAMENTO' },
    { id: 7, name: 'Departamento de Gestion Escolar', parentId: 3, unitType: 'DEPARTAMENTO' },
    { id: 8, name: 'Departamento de Extension y Apoyos Educativos', parentId: 3, unitType: 'DEPARTAMENTO' },
    { id: 9, name: 'Departamento de Recursos Materiales y Servicios', parentId: 4, unitType: 'DEPARTAMENTO' },
    { id: 10, name: 'Seccion de Estudios de Posgrado e Investigacion', parentId: 1, unitType: 'SECCION' },
    { id: 11, name: 'Unidad de Desarrollo e Innovacion (UDI)', parentId: 5, unitType: 'UNIDAD' }
  ];

  const roles = [
    { id: 1, code: 'ROL_DIRECCION', name: 'Direccion (Superadministrador)', unitId: 1 },
    { id: 2, code: 'ROL_SUBDIR_ACADEMICA', name: 'Subdireccion Academica', unitId: 2 },
    { id: 3, code: 'ROL_SUBDIR_ADMINISTRATIVA', name: 'Subdireccion Administrativa', unitId: 4 },
    { id: 4, code: 'ROL_UDI', name: 'Unidad de Desarrollo e Innovacion', unitId: 11 },
    { id: 5, code: 'ROL_SERVICIOS_ESTUDIANTILES', name: 'Servicios Estudiantiles', unitId: 6 },
    { id: 6, code: 'ROL_PROFESOR', name: 'Profesor Responsable', unitId: 2 },
    { id: 7, code: 'ROL_REP_ESTUDIANTIL', name: 'Representante Estudiantil / Club', unitId: 6 },
    { id: 8, code: 'ROL_ALUMNO', name: 'Alumno', unitId: 6 },
    { id: 9, code: 'ROL_GESTION_ESCOLAR', name: 'Gestion Escolar', unitId: 7 },
    { id: 10, code: 'ROL_EXTENSION_APOYOS', name: 'Extension y Apoyos Educativos', unitId: 8 }
  ];

  const permissions = [
    { id: 1, code: 'event.create_draft', name: 'Crear borrador de evento' },
    { id: 2, code: 'event.submit_review', name: 'Enviar evento a revision' },
    { id: 3, code: 'event.approve.professor_aval', name: 'Aprobar aval de profesor' },
    { id: 4, code: 'event.approve.space.academic', name: 'Aprobar espacio academico' },
    { id: 5, code: 'event.approve.space.direction', name: 'Aprobar auditorio por direccion' },
    { id: 6, code: 'event.approve.space.udi', name: 'Aprobar laboratorios por UDI' },
    { id: 7, code: 'event.approve.space.student_services', name: 'Aprobar espacios por servicios estudiantiles' },
    { id: 8, code: 'event.approve.external_access', name: 'Aprobar externos (72h)' },
    { id: 9, code: 'event.publish', name: 'Publicar evento' },
    { id: 10, code: 'event.view_approval_queue', name: 'Ver cola de aprobaciones' },
    { id: 11, code: 'rbac.view', name: 'Ver matriz de roles y permisos' },
    { id: 12, code: 'rbac.manage', name: 'Administrar roles y permisos' },
    { id: 13, code: 'registration.create', name: 'Registrarse a eventos' },
    { id: 14, code: 'registration.view_own', name: 'Ver mis registros' },
    { id: 15, code: 'report.view_attendance', name: 'Ver reportes de asistencia' },
    { id: 16, code: 'attendance.manage', name: 'Gestionar check-in y check-out' }
  ];

  const rolePermissions = [
    ['ROL_DIRECCION', 'event.create_draft'],
    ['ROL_DIRECCION', 'event.submit_review'],
    ['ROL_DIRECCION', 'event.approve.space.direction'],
    ['ROL_DIRECCION', 'event.publish'],
    ['ROL_DIRECCION', 'event.view_approval_queue'],
    ['ROL_DIRECCION', 'rbac.view'],
    ['ROL_DIRECCION', 'rbac.manage'],
    ['ROL_DIRECCION', 'registration.create'],
    ['ROL_DIRECCION', 'registration.view_own'],
    ['ROL_DIRECCION', 'report.view_attendance'],
    ['ROL_DIRECCION', 'attendance.manage'],

    ['ROL_SUBDIR_ACADEMICA', 'event.create_draft'],
    ['ROL_SUBDIR_ACADEMICA', 'event.submit_review'],
    ['ROL_SUBDIR_ACADEMICA', 'event.approve.space.academic'],
    ['ROL_SUBDIR_ACADEMICA', 'event.view_approval_queue'],
    ['ROL_SUBDIR_ACADEMICA', 'rbac.view'],
    ['ROL_SUBDIR_ACADEMICA', 'registration.create'],
    ['ROL_SUBDIR_ACADEMICA', 'registration.view_own'],
    ['ROL_SUBDIR_ACADEMICA', 'report.view_attendance'],
    ['ROL_SUBDIR_ACADEMICA', 'attendance.manage'],

    ['ROL_SUBDIR_ADMINISTRATIVA', 'event.create_draft'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'event.submit_review'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'event.approve.external_access'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'event.view_approval_queue'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'rbac.view'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'registration.create'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'registration.view_own'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'report.view_attendance'],
    ['ROL_SUBDIR_ADMINISTRATIVA', 'attendance.manage'],

    ['ROL_UDI', 'event.create_draft'],
    ['ROL_UDI', 'event.submit_review'],
    ['ROL_UDI', 'event.approve.space.udi'],
    ['ROL_UDI', 'event.view_approval_queue'],
    ['ROL_UDI', 'rbac.view'],
    ['ROL_UDI', 'registration.create'],
    ['ROL_UDI', 'registration.view_own'],

    ['ROL_SERVICIOS_ESTUDIANTILES', 'event.create_draft'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'event.submit_review'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'event.approve.space.student_services'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'event.view_approval_queue'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'rbac.view'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'registration.create'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'registration.view_own'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'report.view_attendance'],
    ['ROL_SERVICIOS_ESTUDIANTILES', 'attendance.manage'],

    ['ROL_PROFESOR', 'event.create_draft'],
    ['ROL_PROFESOR', 'event.submit_review'],
    ['ROL_PROFESOR', 'event.approve.professor_aval'],
    ['ROL_PROFESOR', 'event.view_approval_queue'],
    ['ROL_PROFESOR', 'rbac.view'],
    ['ROL_PROFESOR', 'registration.create'],
    ['ROL_PROFESOR', 'registration.view_own'],
    ['ROL_PROFESOR', 'report.view_attendance'],
    ['ROL_PROFESOR', 'attendance.manage'],

    ['ROL_REP_ESTUDIANTIL', 'event.create_draft'],
    ['ROL_REP_ESTUDIANTIL', 'event.submit_review'],
    ['ROL_REP_ESTUDIANTIL', 'rbac.view'],
    ['ROL_REP_ESTUDIANTIL', 'registration.create'],
    ['ROL_REP_ESTUDIANTIL', 'registration.view_own'],

    ['ROL_ALUMNO', 'rbac.view'],
    ['ROL_ALUMNO', 'registration.create'],
    ['ROL_ALUMNO', 'registration.view_own'],
    ['ROL_GESTION_ESCOLAR', 'rbac.view'],
    ['ROL_GESTION_ESCOLAR', 'report.view_attendance'],
    ['ROL_EXTENSION_APOYOS', 'rbac.view'],
    ['ROL_EXTENSION_APOYOS', 'report.view_attendance']
  ];

  const actors = [
    { id: 1, fullName: 'Cuenta Direccion ESCOM', email: 'direccion@escom.ipn.mx', username: 'direccion', passwordHash: hashPassword('Escom2026!'), actorType: 'ADMINISTRATIVO', unitId: 1 },
    { id: 2, fullName: 'Subdirectora Academica', email: 'subdir.academica@escom.ipn.mx', username: 'subdir.academica', passwordHash: hashPassword('Escom2026!'), actorType: 'ADMINISTRATIVO', unitId: 2 },
    { id: 3, fullName: 'Subdirector Administrativo', email: 'subdir.administrativa@escom.ipn.mx', username: 'subdir.admin', passwordHash: hashPassword('Escom2026!'), actorType: 'ADMINISTRATIVO', unitId: 4 },
    { id: 4, fullName: 'Coordinador UDI', email: 'udi@escom.ipn.mx', username: 'udi', passwordHash: hashPassword('Escom2026!'), actorType: 'ADMINISTRATIVO', unitId: 11 },
    { id: 5, fullName: 'Jefe Servicios Estudiantiles', email: 'servicios.estudiantiles@escom.ipn.mx', username: 'servicios', passwordHash: hashPassword('Escom2026!'), actorType: 'ADMINISTRATIVO', unitId: 6 },
    { id: 6, fullName: 'Profesor Coordinador de Club', email: 'profesor.club@escom.ipn.mx', username: 'profesor.club', passwordHash: hashPassword('Escom2026!'), actorType: 'PROFESOR', unitId: 2 },
    { id: 7, fullName: 'Presidente Club de Programacion', email: 'club.programacion@escom.ipn.mx', username: 'club.programacion', passwordHash: hashPassword('Escom2026!'), actorType: 'ESTUDIANTE', unitId: 6 },
    { id: 8, fullName: 'Representante Cultural ESCOM', email: 'club.cultural@escom.ipn.mx', username: 'club.cultural', passwordHash: hashPassword('Escom2026!'), actorType: 'ESTUDIANTE', unitId: 6 },
    { id: 9, fullName: 'Alumno General ESCOM', email: 'alumno@alumno.ipn.mx', username: 'alumno', passwordHash: hashPassword('Escom2026!'), actorType: 'ESTUDIANTE', unitId: 6 }
  ];

  const actorRoles = [
    [1, 'ROL_DIRECCION'],
    [2, 'ROL_SUBDIR_ACADEMICA'],
    [3, 'ROL_SUBDIR_ADMINISTRATIVA'],
    [4, 'ROL_UDI'],
    [5, 'ROL_SERVICIOS_ESTUDIANTILES'],
    [6, 'ROL_PROFESOR'],
    [7, 'ROL_REP_ESTUDIANTIL'],
    [8, 'ROL_REP_ESTUDIANTIL'],
    [9, 'ROL_ALUMNO']
  ];

  const eventTypes = [
    { id: 1, code: 'ACADEMICO', name: 'Academico', color: '#0047B6' },
    { id: 2, code: 'CULTURAL', name: 'Cultural', color: '#007BE4' },
    { id: 3, code: 'DEPORTIVO', name: 'Deportivo', color: '#00AFCF' }
  ];

  const spaces = [
    { id: 1, name: 'Auditorio', kind: 'Auditorio', capacity: 250 },
    { id: 2, name: 'Sala 14', kind: 'Sala 14', capacity: 100 },
    { id: 3, name: 'Salon A-201', kind: 'Salon', capacity: 45 },
    { id: 4, name: 'Laboratorio de Redes', kind: 'Laboratorio de redes', capacity: 36 },
    { id: 5, name: 'Laboratorio de Sistemas', kind: 'Laboratorio de sistemas', capacity: 36 },
    { id: 6, name: 'Laboratorio de Programacion', kind: 'Laboratorio de programacion', capacity: 36 },
    { id: 7, name: 'Laboratorio de Circuitos Electronicos', kind: 'Laboratorio de circuitos electronicos', capacity: 36 },
    { id: 8, name: 'Laboratorio de Sistemas Digitales', kind: 'Laboratorio de sistemas digitales', capacity: 36 },
    { id: 9, name: 'Laboratorio de Matematicas', kind: 'Laboratorio de matematicas', capacity: 40 },
    { id: 10, name: 'Posgrado', kind: 'Posgrado', capacity: 70 }
  ];

  const baseEvents = [
    { title: 'Jornada de Ciencia de Datos', typeId: 1, spaceId: 1, day: -6, start: 10, end: 13, organizer: 'Subdireccion Academica', topic: 'Sistemas', requiresReg: 1, hasExternal: 1 },
    { title: 'Seminario de Redes Seguras', typeId: 1, spaceId: 4, day: -4, start: 12, end: 14, organizer: 'UDI', topic: 'Redes', requiresReg: 1, hasExternal: 0 },
    { title: 'Taller de Programacion Competitiva', typeId: 1, spaceId: 6, day: -3, start: 9, end: 12, organizer: 'Club de Programacion', topic: 'Programacion', requiresReg: 1, hasExternal: 0 },
    { title: 'Conferencia de Arquitecturas Digitales', typeId: 1, spaceId: 8, day: -2, start: 11, end: 13, organizer: 'Academia de Computacion', topic: 'Sistemas digitales', requiresReg: 1, hasExternal: 1 },
    { title: 'Foro de Posgrado en IA', typeId: 1, spaceId: 10, day: -1, start: 16, end: 18, organizer: 'Coordinacion de Posgrado', topic: 'Posgrado', requiresReg: 1, hasExternal: 1 },

    { title: 'Muestra de Danza Folklorica', typeId: 2, spaceId: 1, day: 0, start: 17, end: 19, organizer: 'Servicios Estudiantiles', topic: 'Cultural', requiresReg: 0, hasExternal: 0 },
    { title: 'Cine Debate de Innovacion', typeId: 2, spaceId: 2, day: 1, start: 15, end: 17, organizer: 'Comite Cultural', topic: 'Cultural', requiresReg: 0, hasExternal: 0 },
    { title: 'Exposicion de Proyectos Multimedia', typeId: 2, spaceId: 3, day: 2, start: 10, end: 12, organizer: 'Academia de Sistemas', topic: 'Sistemas', requiresReg: 0, hasExternal: 0 },
    { title: 'Festival de Talento ESCOM', typeId: 2, spaceId: 1, day: 3, start: 13, end: 16, organizer: 'Direccion', topic: 'Cultural', requiresReg: 1, hasExternal: 1 },
    { title: 'Club de Lectura Tecnologica', typeId: 2, spaceId: 10, day: 4, start: 9, end: 11, organizer: 'Biblioteca', topic: 'Posgrado', requiresReg: 0, hasExternal: 0 },

    { title: 'Torneo Relampago de Futbol', typeId: 3, spaceId: 2, day: 5, start: 8, end: 11, organizer: 'Servicios Estudiantiles', topic: 'Deportivo', requiresReg: 1, hasExternal: 0 },
    { title: 'Ajedrez Universitario por Equipos', typeId: 3, spaceId: 3, day: 6, start: 12, end: 15, organizer: 'Club de Ajedrez', topic: 'Deportivo', requiresReg: 1, hasExternal: 0 },
    { title: 'Reto de Programacion y Resistencia', typeId: 3, spaceId: 6, day: 7, start: 14, end: 18, organizer: 'Comite Deportivo', topic: 'Programacion', requiresReg: 1, hasExternal: 0 },
    { title: 'Clinica de Redes para eSports', typeId: 3, spaceId: 4, day: 8, start: 9, end: 11, organizer: 'Club eSports', topic: 'Redes', requiresReg: 1, hasExternal: 0 },
    { title: 'Torneo de Robotica de Velocidad', typeId: 3, spaceId: 7, day: 9, start: 10, end: 13, organizer: 'Academia de Electronica', topic: 'Circuitos electronicos', requiresReg: 1, hasExternal: 1 },

    { title: 'Masterclass de Algebra Aplicada', typeId: 1, spaceId: 9, day: 10, start: 8, end: 10, organizer: 'Academia de Matematicas', topic: 'Matematicas', requiresReg: 1, hasExternal: 0 },
    { title: 'Bootcamp de Ciberseguridad', typeId: 1, spaceId: 5, day: 11, start: 11, end: 14, organizer: 'Academia de Sistemas', topic: 'Sistemas', requiresReg: 1, hasExternal: 1 },
    { title: 'Semillero de Investigacion de Posgrado', typeId: 1, spaceId: 10, day: 12, start: 16, end: 18, organizer: 'Posgrado ESCOM', topic: 'Posgrado', requiresReg: 1, hasExternal: 1 },
    { title: 'Concurso de Matematicas Discretas', typeId: 1, spaceId: 9, day: 13, start: 13, end: 15, organizer: 'Academia de Matematicas', topic: 'Matematicas', requiresReg: 1, hasExternal: 0 },
    { title: 'Laboratorio Abierto de Sistemas Digitales', typeId: 1, spaceId: 8, day: 14, start: 10, end: 12, organizer: 'UDI', topic: 'Sistemas digitales', requiresReg: 1, hasExternal: 0 },

    { title: 'Recital Acustico Universitario', typeId: 2, spaceId: 1, day: 15, start: 17, end: 19, organizer: 'Extencion y Apoyos Educativos', topic: 'Cultural', requiresReg: 0, hasExternal: 0 },
    { title: 'Laboratorio de Fotografia Digital', typeId: 2, spaceId: 5, day: 16, start: 9, end: 12, organizer: 'Comite Cultural', topic: 'Sistemas', requiresReg: 1, hasExternal: 0 },
    { title: 'Foro de Innovacion Estudiantil', typeId: 2, spaceId: 2, day: 17, start: 11, end: 14, organizer: 'Subdireccion Academica', topic: 'Programacion', requiresReg: 1, hasExternal: 1 },
    { title: 'Semana de Cultura Tecnologica', typeId: 2, spaceId: 3, day: 18, start: 12, end: 15, organizer: 'Direccion', topic: 'Cultural', requiresReg: 0, hasExternal: 0 },
    { title: 'Catedra de Historia de la Computacion', typeId: 2, spaceId: 10, day: 19, start: 10, end: 12, organizer: 'Posgrado ESCOM', topic: 'Posgrado', requiresReg: 0, hasExternal: 1 },

    { title: 'Torneo Interno de Volleyball', typeId: 3, spaceId: 2, day: 20, start: 8, end: 11, organizer: 'Servicios Estudiantiles', topic: 'Deportivo', requiresReg: 1, hasExternal: 0 },
    { title: 'Carrera de Orientacion en Campus', typeId: 3, spaceId: 1, day: 21, start: 7, end: 10, organizer: 'Comite Deportivo', topic: 'Deportivo', requiresReg: 1, hasExternal: 0 },
    { title: 'Copa ESCOM de Ajedrez', typeId: 3, spaceId: 3, day: 22, start: 12, end: 16, organizer: 'Club de Ajedrez', topic: 'Deportivo', requiresReg: 1, hasExternal: 0 },
    { title: 'Hackatlon de Redes y Sistemas', typeId: 3, spaceId: 4, day: 23, start: 9, end: 18, organizer: 'Club de Redes', topic: 'Redes', requiresReg: 1, hasExternal: 1 },
    { title: 'Torneo de Programacion por Equipos', typeId: 3, spaceId: 6, day: 24, start: 10, end: 17, organizer: 'Club de Programacion', topic: 'Programacion', requiresReg: 1, hasExternal: 1 }
  ];

  const events = baseEvents.map((item, index) => {
    const { start, end } = dateAt(item.day, item.start, item.end);
    return {
      title: item.title,
      description: `${item.title} - Tema: ${item.topic}`,
      start,
      end,
      typeId: item.typeId,
      spaceId: item.spaceId,
      organizer: item.organizer,
      status: 'PUBLICADO',
      requiresReg: item.requiresReg,
      hasExternal: item.hasExternal,
      createdByActorId: index % 2 === 0 ? 6 : 2,
      costAmount: 0
    };
  });

  return {
    organizationalUnits,
    roles,
    permissions,
    rolePermissions,
    actors,
    actorRoles,
    eventTypes,
    spaces,
    events
  };
}

async function createSchema(db) {
  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS organizational_units (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      parent_id INTEGER,
      unit_type TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES organizational_units(id)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      unit_id INTEGER,
      FOREIGN KEY (unit_id) REFERENCES organizational_units(id)
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (permission_id) REFERENCES permissions(id)
    );

    CREATE TABLE IF NOT EXISTS actors (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT,
      actor_type TEXT NOT NULL,
      unit_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (unit_id) REFERENCES organizational_units(id)
    );

    CREATE TABLE IF NOT EXISTS actor_roles (
      actor_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      PRIMARY KEY (actor_id, role_id),
      FOREIGN KEY (actor_id) REFERENCES actors(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      capacity INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      type_id INTEGER NOT NULL,
      space_id INTEGER NOT NULL,
      organizer TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'BORRADOR',
      requires_registration INTEGER NOT NULL DEFAULT 0,
      has_external_visitors INTEGER NOT NULL DEFAULT 0,
      created_by_actor_id INTEGER,
      cost_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (type_id) REFERENCES event_types(id),
      FOREIGN KEY (space_id) REFERENCES spaces(id),
      FOREIGN KEY (created_by_actor_id) REFERENCES actors(id)
    );

    CREATE TABLE IF NOT EXISTS event_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      stage_code TEXT NOT NULL,
      required_role_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDIENTE',
      comments TEXT,
      decided_by_actor_id INTEGER,
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (decided_by_actor_id) REFERENCES actors(id)
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      actor_id INTEGER,
      person_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      institutional_email TEXT,
      personal_email TEXT,
      boleta TEXT,
      employee_number TEXT,
      procedencia TEXT,
      carrera TEXT,
      semestre TEXT,
      curp TEXT,
      escuela TEXT,
      turno TEXT,
      credential_qr_url TEXT,
      credential_qr_token TEXT,
      sexo TEXT NOT NULL,
      participant_role TEXT NOT NULL,
      team_name TEXT,
      status TEXT NOT NULL DEFAULT 'CONFIRMADO',
      checkin_at TEXT,
      checkout_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (event_id, email),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (actor_id) REFERENCES actors(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
    CREATE INDEX IF NOT EXISTS idx_events_type_id ON events(type_id);
    CREATE INDEX IF NOT EXISTS idx_events_space_id ON events(space_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by_actor_id);
    CREATE INDEX IF NOT EXISTS idx_event_approvals_event ON event_approvals(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_approvals_status ON event_approvals(status);
    CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON event_registrations(email);
    CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status);
  `);
}

async function ensureAuthColumns(db) {
  const columns = await db.all(`PRAGMA table_info(actors)`);
  const hasUsername = columns.some((column) => column.name === 'username');
  const hasPasswordHash = columns.some((column) => column.name === 'password_hash');

  if (!hasUsername) {
    await db.exec('ALTER TABLE actors ADD COLUMN username TEXT');
  }

  if (!hasPasswordHash) {
    await db.exec('ALTER TABLE actors ADD COLUMN password_hash TEXT');
  }
}

async function ensureRegistrationCredentialColumns(db) {
  const columns = await db.all(`PRAGMA table_info(event_registrations)`);
  const hasCurp = columns.some((column) => column.name === 'curp');
  const hasEscuela = columns.some((column) => column.name === 'escuela');
  const hasTurno = columns.some((column) => column.name === 'turno');
  const hasQrUrl = columns.some((column) => column.name === 'credential_qr_url');
  const hasQrToken = columns.some((column) => column.name === 'credential_qr_token');
  const hasCurpAge = columns.some((column) => column.name === 'curp_age');
  const hasCurpBirthplace = columns.some((column) => column.name === 'curp_birthplace');
  const hasCurpBirthDate = columns.some((column) => column.name === 'curp_birth_date');
  const hasInstitutionalEmail = columns.some((column) => column.name === 'institutional_email');
  const hasPersonalEmail = columns.some((column) => column.name === 'personal_email');

  if (!hasCurp) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN curp TEXT');
  }

  if (!hasEscuela) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN escuela TEXT');
  }

  if (!hasTurno) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN turno TEXT');
  }

  if (!hasQrUrl) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN credential_qr_url TEXT');
  }

  if (!hasQrToken) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN credential_qr_token TEXT');
  }

  if (!hasInstitutionalEmail) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN institutional_email TEXT');
  }

  if (!hasPersonalEmail) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN personal_email TEXT');
  }

  if (!hasCurpAge) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN curp_age INTEGER');
  }

  if (!hasCurpBirthplace) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN curp_birthplace TEXT');
  }

  if (!hasCurpBirthDate) {
    await db.exec('ALTER TABLE event_registrations ADD COLUMN curp_birth_date TEXT');
  }

  await db.exec('CREATE INDEX IF NOT EXISTS idx_event_registrations_credential_token ON event_registrations(credential_qr_token)');
}

async function seedData(db) {
  const seed = buildSeedData();

  const unitCount = await db.get('SELECT COUNT(*) AS total FROM organizational_units');
  if (unitCount.total === 0) {
    for (const unit of seed.organizationalUnits) {
      await db.run(
        'INSERT INTO organizational_units (id, name, parent_id, unit_type) VALUES (?, ?, ?, ?)',
        [unit.id, unit.name, unit.parentId, unit.unitType]
      );
    }
  }

  const roleCount = await db.get('SELECT COUNT(*) AS total FROM roles');
  if (roleCount.total === 0) {
    for (const role of seed.roles) {
      await db.run(
        'INSERT INTO roles (id, code, name, unit_id) VALUES (?, ?, ?, ?)',
        [role.id, role.code, role.name, role.unitId]
      );
    }
  }

  for (const permission of seed.permissions) {
    await db.run(
      'INSERT OR IGNORE INTO permissions (id, code, name) VALUES (?, ?, ?)',
      [permission.id, permission.code, permission.name]
    );
  }

  for (const [roleCode, permissionCode] of seed.rolePermissions) {
    const role = seed.roles.find((item) => item.code === roleCode);
    const permission = seed.permissions.find((item) => item.code === permissionCode);
    await db.run(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [role.id, permission.id]
    );
  }

  const actorCount = await db.get('SELECT COUNT(*) AS total FROM actors');
  if (actorCount.total === 0) {
    for (const actor of seed.actors) {
      await db.run(
        `
          INSERT INTO actors (
            id, full_name, email, username, password_hash, actor_type, unit_id, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [actor.id, actor.fullName, actor.email, actor.username, actor.passwordHash, actor.actorType, actor.unitId]
      );
    }
  } else {
    for (const actor of seed.actors) {
      await db.run(
        `
          UPDATE actors
          SET username = COALESCE(username, ?),
              password_hash = COALESCE(password_hash, ?)
          WHERE id = ?
        `,
        [actor.username, actor.passwordHash, actor.id]
      );
    }
  }

  const actorRoleCount = await db.get('SELECT COUNT(*) AS total FROM actor_roles');
  if (actorRoleCount.total === 0) {
    for (const [actorId, roleCode] of seed.actorRoles) {
      const role = seed.roles.find((item) => item.code === roleCode);
      await db.run(
        'INSERT INTO actor_roles (actor_id, role_id) VALUES (?, ?)',
        [actorId, role.id]
      );
    }
  }

  for (const type of seed.eventTypes) {
    await db.run(
      'INSERT OR IGNORE INTO event_types (id, code, name, color) VALUES (?, ?, ?, ?)',
      [type.id, type.code, type.name, type.color]
    );
  }

  for (const space of seed.spaces) {
    await db.run(
      'INSERT OR IGNORE INTO spaces (id, name, kind, capacity) VALUES (?, ?, ?, ?)',
      [space.id, space.name, space.kind, space.capacity]
    );
  }

  const eventCount = await db.get('SELECT COUNT(*) AS total FROM events');
  if (eventCount.total > 0) {
    return;
  }

  for (const event of seed.events) {
    await db.run(
      `INSERT INTO events (
        title, description, start_datetime, end_datetime, type_id, space_id,
        organizer, status, requires_registration, has_external_visitors,
        created_by_actor_id, cost_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.title,
        event.description,
        event.start,
        event.end,
        event.typeId,
        event.spaceId,
        event.organizer,
        event.status,
        event.requiresReg,
        event.hasExternal,
        event.createdByActorId,
        event.costAmount
      ]
    );
  }
}

async function initializeDatabase({ reset = false } = {}) {
  database = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  if (reset) {
    await database.exec(`
      DROP TABLE IF EXISTS event_approvals;
      DROP TABLE IF EXISTS event_registrations;
      DROP TABLE IF EXISTS events;
      DROP TABLE IF EXISTS actor_roles;
      DROP TABLE IF EXISTS actors;
      DROP TABLE IF EXISTS role_permissions;
      DROP TABLE IF EXISTS permissions;
      DROP TABLE IF EXISTS roles;
      DROP TABLE IF EXISTS organizational_units;
      DROP TABLE IF EXISTS spaces;
      DROP TABLE IF EXISTS event_types;
    `);
  }

  await createSchema(database);
  await ensureAuthColumns(database);
  await ensureRegistrationCredentialColumns(database);
  await seedData(database);
}

function getDatabase() {
  if (!database) {
    throw new Error('La base de datos no esta inicializada.');
  }

  return database;
}

module.exports = {
  initializeDatabase,
  getDatabase
};
