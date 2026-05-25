Checklist de entrega TT 2026-B116

- [x] Código fuente completo en repo
- [x] Scripts para inicializar DB: `scripts/initDb.js`
- [x] Migraciones: `scripts/migrate.js`, `migrations/001_add_notes_to_events.sql`
- [x] Pruebas unitarias: `npm run test:unit` (Jest) — pasan
- [x] Docker multistage: `Dockerfile` actualizado
- [x] `docker-compose.yml` incluido
- [x] CI: `.github/workflows/ci.yml` (tests + migraciones + docker build)
- [x] RBAC UI: `src/views/rbac_manage.ejs` (crear/eliminar permisos y roles)
- [x] Exportes CSV/PDF implementados
- [x] Parseo QR tolerante implementado
- [ ] Revisión final del PDF original para asegurar palabra por palabra (se requiere confirmación humana)

Pasos para empaquetar localmente:

1. Ejecutar tests:

```bash
npm ci
npm run test:unit
```

2. Aplicar migraciones (opcional antes de empaquetar):

```bash
node scripts/migrate.js
```

3. Crear ZIP de entrega (Windows PowerShell):

```powershell
Compress-Archive -Path * -DestinationPath ..\TT_2026-B116_delivery.zip -Force
```

(o Linux/macOS):

```bash
tar -czf ../TT_2026-B116_delivery.tar.gz .
```

Notas:
- El paso final de validación del contenido del PDF debe hacerse comparando `debug/` con el PDF original para garantizar que no falte nada literal del documento.
