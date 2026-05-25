describe('Event model', () => {
  let eventModel;

  beforeAll(async () => {
    jest.resetModules();
    const { initializeDatabase } = require('../src/config/database');
    await initializeDatabase({ reset: true });
    eventModel = require('../src/models/eventModel');
  });

  test('getEvents returns an array', async () => {
    const events = await eventModel.getEvents();
    expect(Array.isArray(events)).toBe(true);
  });

  test('getFilterOptions returns types and spaces', async () => {
    const opts = await eventModel.getFilterOptions();
    expect(opts).toHaveProperty('types');
    expect(opts).toHaveProperty('spaces');
  });
});
