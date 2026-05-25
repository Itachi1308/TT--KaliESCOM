const express = require('express');
const eventController = require('../controllers/eventController');
const workflowModel = require('../models/workflowModel');
const credentialService = require('../services/credentialService');
const { requireAuth, requirePermission } = require('../middleware/authorization');

const router = express.Router();

router.use(requireAuth);

router.get('/events', eventController.listEvents);
router.get('/events/:id', eventController.getEvent);
router.post('/events', requirePermission('event.create_draft'), eventController.createEvent);
router.put('/events/:id', requirePermission('event.create_draft'), eventController.updateEvent);
router.delete('/events/:id', requirePermission('rbac.manage'), eventController.deleteEvent);
router.get('/filters', eventController.getFilters);
router.get('/context', (req, res) => {
	res.json({
		ok: true,
		actor: req.currentActor,
		roles: req.currentRoles,
		permissions: req.currentPermissions
	});
});

router.post('/credenciales/parsear', async (req, res) => {
	try {
		const parsed = await credentialService.parseCredentialInput(req.body.credentialQrInput || req.body.qrInput || req.body.qr || '');
		res.json({ ok: true, data: parsed });
	} catch (error) {
		res.status(400).json({ ok: false, message: error.message });
	}
});

router.get('/approval-queue', async (req, res) => {
	try {
		const queue = await workflowModel.getApprovalQueueForActor(req.currentActor.id);
		res.json({ ok: true, data: queue });
	} catch (error) {
		res.status(500).json({ ok: false, message: error.message });
	}
});

const registrationController = require('../controllers/registrationController');
const rbacController = require('../controllers/rbacController');

router.get('/reports/:eventId/csv', requirePermission('report.view_attendance'), registrationController.exportCsv);
router.get('/reports/:eventId/pdf', requirePermission('report.view_attendance'), registrationController.exportPdf);

// RBAC management
router.get('/rbac/matrix', requirePermission('rbac.view'), rbacController.apiGetMatrix);
router.post('/rbac/permissions', requirePermission('rbac.manage'), rbacController.apiCreatePermission);
router.post('/rbac/roles', requirePermission('rbac.manage'), rbacController.apiCreateRole);
router.post('/rbac/roles/assign-permission', requirePermission('rbac.manage'), rbacController.apiAddPermissionToRole);
router.post('/rbac/actors/assign-role', requirePermission('rbac.manage'), rbacController.apiAssignRoleToActor);

module.exports = router;
