const eventModel = require('../models/eventModel');

async function home(req, res) {
  const upcoming = await eventModel.getUpcoming(8);
  res.render('index', {
    pageTitle: 'Inicio',
    upcoming
  });
}

async function calendar(req, res) {
  const filterOptions = await eventModel.getFilterOptions();
  res.render('calendar', {
    pageTitle: 'Calendario',
    filterOptions
  });
}

async function events(req, res) {
  const list = await eventModel.getUpcoming(30);
  res.render('events', {
    pageTitle: 'Listado de eventos',
    events: list
  });
}

async function eventDetail(req, res) {
  try {
    const eventId = Number(req.params.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).render('error', { message: 'ID de evento inválido' });
    }

    const ev = await eventModel.getById(eventId);
    if (!ev) {
      return res.status(404).render('error', { message: 'Evento no encontrado' });
    }

    res.render('eventDetail', {
      pageTitle: ev.title,
      event: ev
    });
  } catch (error) {
    res.status(500).render('error', { message: 'Error al cargar el evento' });
  }
}

function flow(req, res) {
  res.render('flow', { pageTitle: 'Flujo de autorizacion' });
}

function feasibility(req, res) {
  res.render('feasibility', { pageTitle: 'Factibilidad del sistema' });
}

module.exports = {
  home,
  calendar,
  events,
  eventDetail,
  flow,
  feasibility
};
