const eventModel = require('../models/eventModel');
const { requirePermission } = require('../middleware/authorization');
const notificationService = require('../services/notificationService');
const mailerService = require('../services/mailerService');

async function listEvents(req, res) {
  try {
    const events = await eventModel.getEvents({
      types: req.query.types,
      spaces: req.query.spaces
    });

    const formatted = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: event.color,
      borderColor: event.color,
      textColor: '#FFFFFF',
      extendedProps: {
        description: event.description,
        organizer: event.organizer,
        typeName: event.typeName,
        typeCode: event.typeCode,
        spaceName: event.spaceName,
        spaceKind: event.spaceKind,
        capacity: event.capacity,
        requiresRegistration: Boolean(event.requiresRegistration),
        hasExternalVisitors: Boolean(event.hasExternalVisitors)
      }
    }));

    res.json({
      ok: true,
      total: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'No fue posible obtener los eventos.',
      error: error.message
    });
  }
}

async function getFilters(req, res) {
  try {
    const options = await eventModel.getFilterOptions();
    res.json({ ok: true, data: options });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
}


async function getEvent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const event = await eventModel.getById(id);
    if (!event) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    res.json({ ok: true, data: event });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
}

async function createEvent(req, res) {
  try {
    const payload = req.body || {};
    const created = await eventModel.createEvent({
      title: payload.title,
      description: payload.description,
      start: payload.start,
      end: payload.end,
      typeId: payload.typeId,
      spaceId: payload.spaceId,
      organizer: payload.organizer,
      status: payload.status,
      requiresRegistration: payload.requiresRegistration,
      hasExternal: payload.hasExternal,
      createdByActorId: req.currentActor ? req.currentActor.id : null,
      costAmount: payload.costAmount
    });

    try {
      await notificationService.createNotification({
        actorId: req.currentActor ? req.currentActor.id : null,
        eventId: created.id,
        type: 'event.created',
        message: `Evento creado: ${created.title}`
      });
    } catch (err) {
      // no bloquear la respuesta si falla la notificación
    }
    try {
      if (req.currentActor && req.currentActor.email) {
        await mailerService.sendMail({
          to: req.currentActor.email,
          subject: `Evento creado: ${created.title}`,
          text: `Se ha creado el evento "${created.title}". Revisa la plataforma para más detalles.`
        });
      }
    } catch (err) {
      // ignorar fallos de correo
    }

    res.status(201).json({ ok: true, data: created });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
}

async function updateEventController(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const payload = req.body || {};
    const updated = await eventModel.updateEvent(id, payload);
    if (!updated) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    try {
      await notificationService.createNotification({
        actorId: req.currentActor ? req.currentActor.id : null,
        eventId: updated.id,
        type: 'event.updated',
        message: `Evento actualizado: ${updated.title}`
      });
    } catch (err) {
      // ignorar errores de notificación
    }
    try {
      if (req.currentActor && req.currentActor.email) {
        await mailerService.sendMail({
          to: req.currentActor.email,
          subject: `Evento actualizado: ${updated.title}`,
          text: `El evento "${updated.title}" ha sido actualizado.`
        });
      }
    } catch (err) {
      // ignorar fallos de correo
    }
    res.json({ ok: true, data: updated });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
}

async function deleteEventController(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await eventModel.deleteEvent(id);
    if (!ok) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = {
  listEvents,
  getFilters,
  getEvent,
  createEvent,
  updateEvent: updateEventController,
  deleteEvent: deleteEventController
};
