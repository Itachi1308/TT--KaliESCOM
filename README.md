# Sistema Web ESCOM Eventos (MVC)

Sistema web para organizacion e informacion de eventos academicos, culturales y deportivos en ESCOM.

## Caracteristicas implementadas

- Backend en Node.js + Express.
- Arquitectura MVC:
  - Modelos: acceso a datos relacionales.
  - Vistas: EJS con navegacion por pagina.
  - Controladores: logica de negocio y API.
- Base de datos relacional SQLite con tablas:
  - `organizational_units`
  - `roles`
  - `permissions`
  - `role_permissions`
  - `actors`
  - `actor_roles`
  - `event_types`
  - `spaces`
  - `events`
  - `event_approvals`
  - `event_registrations`
- Calendario interactivo con FullCalendar:
  - Posicionado automaticamente en fecha actual local.
  - Filtros por tipo: academico, cultural, deportivo.
  - Filtros por espacio: auditorio, sala 14, salon, laboratorios y posgrado.
- Semillas con muchos eventos de prueba en todas las categorias y espacios solicitados.
- RBAC implementado segun organigrama ESCOM con flujo real de aprobaciones:
  - Estudiante requiere aval de profesor responsable.
  - Auditorio lo valida Direccion.
  - Sala 14 y salones los valida Subdireccion Academica.
  - Laboratorios los valida UDI.
  - Externos requieren Subdireccion Administrativa y minimo 72 horas.
  - Publicacion final por Direccion.
- Colores institucionales ESCOM aplicados en UI:
  - Azul obscuro oficial `#0047B6`
  - Azul turquesa
- Inicio de sesion por perfil institucional (sesion HTTP):
  - Cada actor tiene usuario y contrasena.
  - Los permisos se aplican al perfil autenticado.
- Registro de asistentes conforme entrevistas:
  - Campos obligatorios por tipo (alumno/docente/externo).
  - Rol del asistente (asistente, ponente, staff, participante activo, observador).
  - Soporte para registro por equipos (teamName).
  - Deteccion de empalmes por horario/correo.
  - Control de aforo con lista de espera automatica.
- Reporteria y asistencia:
  - Reportes por sexo, carrera y procedencia.
  - Control de entrada y salida (check-in/check-out).
  - Calculo de porcentaje de entrada sobre confirmados.

## Estructura del proyecto

```text
pruebas1/
  database/
  public/
    css/
    js/
  scripts/
  src/
    config/
    controllers/
    models/
    routes/
    views/
  server.js
  package.json
```

## Requisitos

- Node.js 18 o superior
- npm

## Ejecucion correcta

1. Abrir terminal en la carpeta del proyecto.
2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Inicializar base de datos con datos de prueba:

   ```bash
   npm run db:init
   ```

4. Iniciar servidor:

   ```bash
   npm start
   ```

5. Abrir en navegador:

   ```text
   http://localhost:3000
   ```

6. Iniciar sesion en:

  ```text
  http://localhost:3000/login
  ```

## Credenciales de prueba

- Usuario: `direccion`
- Usuario: `subdir.academica`
- Usuario: `subdir.admin`
- Usuario: `udi`
- Usuario: `servicios`
- Usuario: `profesor.club`
- Usuario: `club.programacion`
- Usuario: `club.cultural`
- Usuario: `alumno`
- Contrasena para todos: `Escom2026!`

## Paginas clave

- `/rbac`: matriz de roles y permisos del perfil autenticado.

Docker
------

Se provee un `Dockerfile` multistage y `docker-compose.yml` para ejecutar la aplicación en contenedor.

- Construir imagen: `docker build -t escom-eventos .`
- Ejecutar con compose: `docker-compose up --build`

Migraciones
----------

Hay un ejemplo de migración en `migrations/001_add_notes_to_events.sql`. Use `npm run migrate` o `node scripts/migrate.js` para aplicar migraciones. Las migraciones se registran en la tabla `migrations`.

Tests
-----

Ejecutar pruebas unitarias: `npm run test:unit` (inicializa BD de prueba automáticamente).

Entrega TT
---------

Este repositorio se ha adaptado para cubrir los requerimientos del TT '2026-B116'. Las comprobaciones automatizadas (tests) y las instrucciones de despliegue con Docker están incluidas. Revise `debug/` para los textos extraídos del PDF original.
- `/admin`: panel de borradores, envio a revision y cola de aprobaciones del perfil autenticado.
- `/registro/:eventId`: formulario de registro de asistencia.
- `/mis-registros`: historial del usuario autenticado.
- `/reportes`: estadisticas y control de entrada/salida (roles autorizados).
- `/api/credenciales/parsear`: lectura de credencial QR vcred para autollenado.

## Flujo QR

- La credencial institucional vcred se puede pegar como enlace `https://servicios.dae.ipn.mx/vcred/?h=...` o como token directo.
- El sistema extrae automaticamente boleta, nombre, CURP, carrera, escuela y turno cuando la pagina descargada mantiene la estructura del archivo en `top/JavaScript/vcred.devtools.txt`.
- El mismo QR se usa para registrar entrada y salida en `/reportes`.

## Script CMD (Windows)

Puedes ejecutar directamente:

```text
scripts\instalar_y_ejecutar.cmd
```

Ese script hace automaticamente:
- `npm install`
- `npm run db:init`
- `npm start`

## Pruebas automatizadas

Hay una prueba de humo que valida inicio de sesión y el endpoint `/api/context`.

Ejecutar:

```bash
npm test
```

El script de prueba es `scripts/testSmoke.js`.

## Despliegue con Docker

Instrucciones básicas para ejecutar con Docker en producción local o en un servidor.

1. Copia el archivo de ejemplo a `.env` y ajusta el secreto de sesión:

```bash
cp .env.sample .env
# editar .env
```

2. Construir la imagen y levantar el servicio:

```bash
docker compose up --build -d
```

3. (Opcional) Inicializar la base de datos con datos de prueba (ejecución única):

```bash
docker compose run --rm escom-eventos npm run db:init
```

4. Acceder a `http://localhost:3000`.

## Integración continua

Se incluye un workflow de GitHub Actions en `.github/workflows/nodejs.yml` que instala dependencias, inicializa la base de datos y ejecuta la prueba de humo.

## Migraciones

Se añadió un sistema simple de migraciones basado en archivos SQL en la carpeta `migrations/`.

Aplicar migraciones:

```bash
npm run migrate
```

## Exportes de reportes

Los administradores autorizados pueden descargar reportes de asistencia a través de la API:

- CSV: `GET /api/reports/:eventId/csv` (permiso `report.view_attendance`)
- PDF: `GET /api/reports/:eventId/pdf` (permiso `report.view_attendance`)


## Diagrama de flujo corregido

Se incluye en la pagina `Flujo` y en `scripts/diagrama_corregido.mmd` con transiciones de reproceso controladas para evitar bucles ambiguos.
"# TT--KaliESCOM" 
