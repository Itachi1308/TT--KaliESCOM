describe('RBAC model', () => {
  let rbacModel;

  beforeAll(async () => {
    jest.resetModules();
    const { initializeDatabase } = require('../src/config/database');
    await initializeDatabase({ reset: true });
    rbacModel = require('../src/models/rbacModel');
  });

  test('can create permission, role and assign permission', async () => {
    const perm = await rbacModel.createPermission('test.permission', 'Test permission');
    expect(perm).toHaveProperty('code', 'test.permission');

    const role = await rbacModel.createRole('ROL_TEST', 'Rol de prueba', null);
    expect(role).toHaveProperty('code', 'ROL_TEST');

    const added = await rbacModel.addPermissionToRole('ROL_TEST', 'test.permission');
    expect(added).toBe(true);

    const matrix = await rbacModel.getRolePermissionMatrix();
    const row = matrix.matrix.find((r) => r.role.code === 'ROL_TEST');
    expect(row).toBeDefined();
    expect(row.permissionCodes).toContain('test.permission');
  });
});
