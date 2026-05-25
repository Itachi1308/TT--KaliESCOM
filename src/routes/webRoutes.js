const express = require('express');
const pageController = require('../controllers/pageController');
const rbacController = require('../controllers/rbacController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const registrationController = require('../controllers/registrationController');
const { requireAuth, requirePermission } = require('../middleware/authorization');

const router = express.Router();

router.get('/login', authController.loginView);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/', requireAuth, pageController.home);
router.get('/calendario', requireAuth, pageController.calendar);
router.get('/eventos', requireAuth, pageController.events);
router.get('/eventos/:eventId', requireAuth, pageController.eventDetail);
router.get('/flujo', requireAuth, pageController.flow);
router.get('/factibilidad', requireAuth, pageController.feasibility);
router.get('/rbac', requirePermission('rbac.view'), rbacController.dashboard);
router.get('/rbac/manage', requirePermission('rbac.manage'), rbacController.manageView);
router.post('/rbac/manage/permissions', requirePermission('rbac.manage'), rbacController.handleCreatePermission);
router.post('/rbac/manage/roles', requirePermission('rbac.manage'), rbacController.handleCreateRole);
router.post('/rbac/manage/roles/assign-permission', requirePermission('rbac.manage'), rbacController.handleAssignPermission);
router.post('/rbac/manage/actors/assign-role', requirePermission('rbac.manage'), rbacController.handleAssignRoleToActor);
router.post('/rbac/manage/roles/remove-permission', requirePermission('rbac.manage'), rbacController.handleRemovePermissionFromRole);
router.post('/rbac/manage/actors/remove-role', requirePermission('rbac.manage'), rbacController.handleRemoveRoleFromActor);
router.get('/registro/:eventId', requirePermission('registration.create'), registrationController.form);
router.post('/registro/:eventId', requirePermission('registration.create'), registrationController.submit);
router.get('/mis-registros', requirePermission('registration.view_own'), registrationController.myRegistrations);
router.get('/reportes', requirePermission('report.view_attendance'), registrationController.reports);
router.post('/reportes/registro/:registrationId/checkin', requirePermission('attendance.manage'), registrationController.checkin);
router.post('/reportes/registro/:registrationId/checkout', requirePermission('attendance.manage'), registrationController.checkout);
router.post('/reportes/qr/checkin', requirePermission('attendance.manage'), registrationController.checkinByQr);
router.post('/reportes/qr/checkout', requirePermission('attendance.manage'), registrationController.checkoutByQr);

router.get('/admin', requirePermission('event.create_draft'), adminController.panel);
router.post('/admin/eventos', requirePermission('event.create_draft'), adminController.createDraft);
router.post('/admin/eventos/:eventId/enviar', requirePermission('event.submit_review'), adminController.submitReview);
router.post('/admin/aprobaciones/:approvalId/decidir', requirePermission('event.view_approval_queue'), adminController.decide);

module.exports = router;
