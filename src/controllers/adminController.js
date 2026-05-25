const workflowModel = require('../models/workflowModel');

async function panel(req, res) {
  const actor = req.currentActor;
  const [eventTypes, spaces, mine, queue] = await Promise.all([
    workflowModel.getAssignableEventTypes(),
    workflowModel.getAssignableSpaces(),
    workflowModel.getEventsCreatedBy(actor.id),
    workflowModel.getApprovalQueueForActor(actor.id)
  ]);

  res.render('admin', {
    pageTitle: 'Panel de gestion y aprobacion',
    eventTypes,
    spaces,
    mine,
    queue,
    errors: []
  });
}

async function createDraft(req, res) {
  try {
    const actor = req.currentActor;

    const eventId = await workflowModel.createDraftEvent({
      title: req.body.title,
      description: req.body.description,
      start: req.body.start,
      end: req.body.end,
      typeId: Number(req.body.typeId),
      spaceId: Number(req.body.spaceId),
      organizer: req.body.organizer || actor.fullName,
      hasExternalVisitors: req.body.hasExternalVisitors === '1',
      requiresRegistration: req.body.requiresRegistration === '1',
      createdByActorId: actor.id,
      costAmount: Number(req.body.costAmount || 0)
    });

    res.redirect(`/admin?ok=created&id=${eventId}`);
  } catch (error) {
    const actor = req.currentActor;
    const [eventTypes, spaces, mine, queue] = await Promise.all([
      workflowModel.getAssignableEventTypes(),
      workflowModel.getAssignableSpaces(),
      workflowModel.getEventsCreatedBy(actor.id),
      workflowModel.getApprovalQueueForActor(actor.id)
    ]);

    res.status(400).render('admin', {
      pageTitle: 'Panel de gestion y aprobacion',
      eventTypes,
      spaces,
      mine,
      queue,
      errors: [error.message]
    });
  }
}

async function submitReview(req, res) {
  try {
    const eventId = Number(req.params.eventId);
    const event = await workflowModel.getEventById(eventId);

    if (!event) {
      throw new Error('Evento no encontrado.');
    }

    const canBypassOwnership = (req.currentPermissions || []).some((permission) => permission.code === 'event.publish');
    if (!canBypassOwnership && event.createdByActorId !== req.currentActor.id) {
      throw new Error('Solo el creador del borrador puede enviarlo a revision.');
    }

    await workflowModel.submitEventForReview(eventId);
    res.redirect(`/admin?ok=submitted&id=${req.params.eventId}`);
  } catch (error) {
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
}

async function decide(req, res) {
  try {
    await workflowModel.decideApproval({
      approvalId: Number(req.params.approvalId),
      actorId: req.currentActor.id,
      decision: req.body.decision,
      comments: req.body.comments
    });

    res.redirect('/admin?ok=decision');
  } catch (error) {
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
}

module.exports = {
  panel,
  createDraft,
  submitReview,
  decide
};
