const registrationModel = require('../models/registrationModel');
const credentialService = require('../services/credentialService');
const PDFDocument = require('pdfkit');

function getRegistrationDefaults(currentActor) {
  if (!currentActor) {
    return {
      fullName: '',
      institutionalEmail: '',
      personalEmail: '',
      personType: 'ALUMNO'
    };
  }

  const mappedType = currentActor.actorType === 'PROFESOR'
    ? 'DOCENTE'
    : currentActor.actorType === 'ESTUDIANTE'
      ? 'ALUMNO'
      : 'EXTERNO';

  return {
    fullName: currentActor.fullName || '',
    institutionalEmail: currentActor.email || '',
    personalEmail: '',
    personType: mappedType
  };
}

async function form(req, res) {
  const eventId = Number(req.params.eventId);
  const event = await registrationModel.getPublishedEventById(eventId);

  if (!event) {
    return res.status(404).render('notFound', {
      pageTitle: 'Evento no encontrado'
    });
  }

  const prefill = getRegistrationDefaults(req.currentActor) || { personType: 'ALUMNO', fullName: '', institutionalEmail: '', personalEmail: '', boleta: '', carrera: '', escuela: '', turno: '' };

  return res.render('registrationForm', {
    pageTitle: 'Registro al evento',
    event,
    prefill,
    errors: [],
    success: null
  });
}

async function submit(req, res) {
  const eventId = Number(req.params.eventId);

  try {
    const credential = req.body.credentialQrInput
      ? await credentialService.parseCredentialInput(req.body.credentialQrInput)
      : null;

    // Extract CURP data for internal tracking (not displayed)
    let curpData = {};
    if (req.body.curp) {
      curpData = credentialService.parseCurp(req.body.curp);
    }

    // Validate name match if both CURP and full name are present
    if (req.body.curp && req.body.fullName) {
      const namesMatch = credentialService.validateNameMatch(req.body.fullName, credential?.fullName || req.body.fullName);
      if (!namesMatch && credential?.fullName) {
        throw new Error(`El nombre en el CURP no coincide con el nombre en la credencial (${credential.fullName}). Verifica los datos.`);
      }
    }

    // Normalize legacy/hidden field names before merging
    const normalizedBody = { ...req.body };
    if (!normalizedBody.curp && normalizedBody.credentialCurp) {
      normalizedBody.curp = normalizedBody.credentialCurp;
    }
    if (!normalizedBody.escuela && normalizedBody.credentialEscuela) {
      normalizedBody.escuela = normalizedBody.credentialEscuela;
    }
    if (!normalizedBody.turno && normalizedBody.credentialTurno) {
      normalizedBody.turno = normalizedBody.credentialTurno;
    }

    const payload = {
      ...normalizedBody,
      ...credential,
      curpAge: curpData.age,
      curpBirthplace: curpData.birthplace,
      curpBirthDate: curpData.birthDate
    };

    if (!payload.personalEmail && req.body.email) {
      payload.personalEmail = req.body.email;
    }

    if (!payload.fullName && credential && credential.fullName) {
      payload.fullName = credential.fullName;
    }

    if (!payload.personType && credential && credential.personTypeHint) {
      payload.personType = credential.personTypeHint;
    }

    const result = await registrationModel.registerToEvent({
      eventId,
      actorId: req.currentActor.id,
      payload
    });

    const event = await registrationModel.getPublishedEventById(eventId);
    const prefill = getRegistrationDefaults(req.currentActor) || { personType: 'ALUMNO', fullName: '', institutionalEmail: '', personalEmail: '', boleta: '', carrera: '', escuela: '', turno: '' };

    return res.render('registrationForm', {
      pageTitle: 'Registro al evento',
      event,
      prefill,
      errors: [],
      success:
        result.status === 'CONFIRMADO'
          ? 'Registro confirmado exitosamente.'
          : `Aforo lleno: quedaste en lista de espera (posicion ${result.waitlistPosition}).`
    });
  } catch (error) {
    const event = await registrationModel.getPublishedEventById(eventId);
    const prefill = getRegistrationDefaults(req.currentActor) || { personType: 'ALUMNO', fullName: '', institutionalEmail: '', personalEmail: '', boleta: '', carrera: '', escuela: '', turno: '' };

    return res.status(400).render('registrationForm', {
      pageTitle: 'Registro al evento',
      event,
      prefill,
      errors: [error.message],
      success: null
    });
  }
}

async function myRegistrations(req, res) {
  const registrations = await registrationModel.getMyRegistrations(req.currentActor.id);
  return res.render('myRegistrations', {
    pageTitle: 'Mis registros',
    registrations
  });
}

async function reports(req, res) {
  const events = await registrationModel.getPublishedEventsSimple();
  const selectedEventId = Number(req.query.eventId || 0);

  let report = null;
  if (selectedEventId > 0) {
    report = await registrationModel.getEventReport(selectedEventId);
  }

  return res.render('reports', {
    pageTitle: 'Reportes de asistencia',
    events,
    selectedEventId,
    report
  });
}

async function checkin(req, res) {
  await registrationModel.markCheckin(Number(req.params.registrationId));
  const eventId = Number(req.body.eventId || 0);
  return res.redirect(eventId > 0 ? `/reportes?eventId=${eventId}` : '/reportes');
}

async function checkout(req, res) {
  await registrationModel.markCheckout(Number(req.params.registrationId));
  const eventId = Number(req.body.eventId || 0);
  return res.redirect(eventId > 0 ? `/reportes?eventId=${eventId}` : '/reportes');
}

async function checkinByQr(req, res) {
  const eventId = Number(req.body.eventId || 0);

  try {
    const credential = req.body.credentialQrInput
      ? await credentialService.parseCredentialInput(req.body.credentialQrInput)
      : null;

    if (!credential) {
      throw new Error('Debes capturar el QR de la credencial.');
    }

    await registrationModel.markCheckinByCredential(eventId, credential);
    return res.redirect(`/reportes?eventId=${eventId}`);
  } catch (error) {
    return res.status(400).render('error', {
      pageTitle: 'Error de entrada',
      message: error.message
    });
  }
}

async function checkoutByQr(req, res) {
  const eventId = Number(req.body.eventId || 0);

  try {
    const credential = req.body.credentialQrInput
      ? await credentialService.parseCredentialInput(req.body.credentialQrInput)
      : null;

    if (!credential) {
      throw new Error('Debes capturar el QR de la credencial.');
    }

    await registrationModel.markCheckoutByCredential(eventId, credential);
    return res.redirect(`/reportes?eventId=${eventId}`);
  } catch (error) {
    return res.status(400).render('error', {
      pageTitle: 'Error de salida',
      message: error.message
    });
  }
}

module.exports = {
  form,
  submit,
  myRegistrations,
  reports,
  checkin,
  checkout,
  checkinByQr,
  checkoutByQr,
  exportCsv,
  exportPdf
};

async function exportCsv(req, res) {
  const eventId = Number(req.params.eventId || 0);
  const report = await registrationModel.getEventReport(eventId);
  if (!report) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });

  // Build CSV
  const rows = [];
  rows.push(['Nombre', 'Email', 'Institucional', 'Tipo', 'Rol', 'Estado', 'Checkin', 'Checkout'].join(','));
  for (const r of report.registrations) {
    rows.push([
      `"${(r.fullName || '').replace(/"/g, '""')}"`,
      r.email || '',
      r.institutionalEmail || '',
      r.personType || '',
      r.participantRole || '',
      r.status || '',
      r.checkinAt || '',
      r.checkoutAt || ''
    ].join(','));
  }

  const csv = rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="report_event_${eventId}.csv"`);
  res.send(csv);
}

async function exportPdf(req, res) {
  const eventId = Number(req.params.eventId || 0);
  const report = await registrationModel.getEventReport(eventId);
  if (!report) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report_event_${eventId}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(`Reporte: ${report.event.title}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);

  for (const r of report.registrations) {
    doc.text(`${r.fullName} — ${r.email} — ${r.personType} — ${r.participantRole} — ${r.status}`);
  }

  doc.end();
}
