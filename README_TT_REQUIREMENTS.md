Resumen de requisitos del TT (extraído heurísticamente)

- Tecnologías requeridas (detectadas): Node.js, Express, EJS, SQLite, PDFKit, Docker, GitHub Actions, Jest, Supertest.

- Requisitos funcionales y mapeo a implementaciones:
  - Gestión de eventos (CRUD): implementado en `src/models/eventModel.js` y `src/controllers/eventController.js`.
  - Flujo de aprobaciones RBAC: `src/models/rbacModel.js`, `src/controllers/rbacController.js` y `src/views/rbac.ejs`.
  - Registro y control de aforo: `src/models/registrationModel.js`, `src/controllers/registrationController.js`.
  - Exportes CSV/PDF: `registrationController` (usa `pdfkit`).
  - Parseo de credenciales QR: `src/services/credentialService.js` con tolerancia ante fallos.
  - Panel de administración RBAC: `src/views/rbac_manage.ejs`, rutas en `src/routes/webRoutes.js`.
  - Migraciones y script de inicialización: `scripts/migrate.js`, `scripts/initDb.js`, `migrations/`.
  - Despliegue con Docker: `Dockerfile` (multistage), `docker-compose.yml`, `.dockerignore`.
  - Pruebas unitarias: `tests/*.test.js` (Jest + Supertest). Command: `npm run test:unit`.

- Estado actual:
  - Implementado: la mayoría de funcionalidades solicitadas por el TT están presentes.
  - Pendiente: revisión manual del PDF original para confirmar redacción exacta y entregables formales (anexos, diagramas, formatos requeridos).

Siguientes pasos recomendados:
1. Revisión conjunta del `debug/` con el texto extraído del PDF para validar que no falte ninguna sección.
2. Ajustes finales en la UI RBAC y generación de capturas/artefactos solicitados por el TT.
3. Ejecutar CI en GitHub (PR) y validar build Docker.
4. Generar paquete de entrega (ZIP) y README final.
