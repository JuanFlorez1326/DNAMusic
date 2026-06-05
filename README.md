# DNA Music — Sistema de Gestión de Estudiantes

ERP modular para DNA Music. Este módulo cubre gestión de estudiantes por sede con autenticación basada en roles (ADMIN / OPERADOR).

---

## 1. Cómo correr el proyecto localmente

### Prerrequisitos

- Docker + Docker Compose (para cualquiera de las opciones)
- Node.js 18+ y npm (solo para Opción B)

---

### Opción A — Todo con Docker (un solo comando)

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Levanta los 3 servicios en orden: PostgreSQL → API (seed automático) → Frontend nginx.

| Servicio  | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:4200            |
| API       | http://localhost:3000            |
| Swagger   | http://localhost:3000/api/docs   |

Para detener y conservar datos: `docker compose down`  
Para detener y borrar la BD (reset completo): `docker compose down -v`

---

### Opción B — DB en Docker, código en local (recomendado para desarrollo)

**1. Levantar solo PostgreSQL:**

```bash
docker compose up db -d
```

**2. Configurar y arrancar el API:**

```bash
cd api
cp .env.example .env        # DATABASE_URL ya apunta a localhost:5432
npm install
npx prisma db push          # crea las tablas
npx ts-node prisma/seed.ts  # carga datos de prueba
npm run dev
```

**3. En otra terminal, arrancar el frontend:**

```bash
cd web
npm install
npm start
```

| Servicio  | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:4200            |
| API       | http://localhost:3000            |
| Swagger   | http://localhost:3000/api/docs   |


---

## 3. Credenciales de prueba

| Rol           | Email                         | Contraseña | Alcance              |
|---------------|-------------------------------|------------|----------------------|
| ADMIN         | admin@dnamusic.co             | Admin123!  | Todas las sedes      |
| Operador BOG  | operador.bog@dnamusic.co      | Oper123!   | Solo sede Bogotá     |
| Operador MED  | operador.med@dnamusic.co      | Oper123!   | Solo sede Medellín   |

---

## 4. Decisiones técnicas

### Framework: Express + TypeScript

Elegí Express sobre NestJS para mantener el proyecto simple y sin magia implícita. Para una prueba técnica es más fácil de explicar cada línea que con los decoradores de NestJS.

### ORM: Prisma

Fuertemente tipado, migración declarativa, y `prisma generate` da autocompletado perfecto. El `$queryRaw` para el endpoint de stats permite escribir SQL optimizado cuando Prisma no lo genera eficientemente.

### Estructura: controllers / routes / schemas / middlewares

Separación clásica por responsabilidad. Cada capa tiene una sola razón para cambiar:
- `schemas/`: validación de inputs con Zod (en el borde del sistema)
- `middlewares/`: autenticación y autorización (transversales)
- `controllers/`: lógica de negocio
- `routes/`: wiring de middlewares + controllers

### Frontend: Angular 20 standalone + signals

Angular 20 con componentes standalone (sin NgModules) y signals para estado reactivo sin RxJS para estado UI simple. Las llamadas HTTP sí usan Observables (lo que Angular HTTP Client devuelve naturalmente). Lazy loading en todas las rutas.

---

## 5. Decisiones de seguridad

### Implementadas

| Medida | Implementación | Por qué |
|--------|---------------|---------|
| **Hashing de contraseñas** | bcrypt con 12 salt rounds | bcrypt es resistente a GPU brute-force por su costo computacional configurable. 12 rounds ≈ 300ms en CPU moderna, suficiente para frenar ataques offline. |
| **Timing attacks en login** | Siempre corro `bcrypt.compare()`, incluso si el usuario no existe (contra un dummy hash) | Sin esto, si el usuario no existe el response llega en 1ms; si existe llega en 300ms. Un atacante puede enumerar emails midiendo tiempos. |
| **Mensajes genéricos** | "Credenciales inválidas" en todos los casos de error de login | Nunca "email no registrado" — no confirma ni niega la existencia del usuario. |
| **Rate limiting en login** | 5 intentos por IP cada 15 minutos (`express-rate-limit`) | Protección contra fuerza bruta. Después de 5 fallos, el IP recibe 429 con mensaje de espera. |
| **Rate limiting global** | 200 req/min por IP en todos los endpoints | Protección básica contra scraping y DoS. |
| **JWT con expiración** | Token expira en 8h | Limita la ventana de abuso si un token es robado. |
| **Headers de seguridad** | `helmet()` en todas las respuestas | Activa Content-Security-Policy, X-Frame-Options, HSTS, etc. |
| **CORS estricto** | Solo acepta requests del origin configurado en `CORS_ORIGIN` | Previene que otros dominios hagan requests autenticados. |
| **Validación de inputs** | Zod en todos los endpoints | Rechaza payloads malformados, emails inválidos, campos vacíos. |
| **Límite de body** | `express.json({ limit: '1mb' })` | Previene ataques de payload gigante. |
| **RBAC** | Middleware `requireAdmin` y scope de sede para OPERADOR | Un OPERADOR no puede ver ni modificar estudiantes de otra sede, incluso pasando el ID manualmente. |
| **Registro solo por ADMIN** | El endpoint `/register` requiere token de ADMIN | Nadie puede auto-registrarse como ADMIN. |

### Conozco pero no implementé (por tiempo)

| Medida | Por qué la dejaría para la siguiente iteración |
|--------|----------------------------------------------|
| **Refresh tokens** | Requiere tabla en DB para almacenar y revocar tokens. Con tokens de 8h y los usuarios que cierran sesión al terminar el día, el trade-off es aceptable por ahora. |
| **Cookies httpOnly** | Más seguro contra XSS que localStorage. Lo implementaría en producción real junto con CSRF tokens. Usé Authorization header para simplicidad en el contexto de una SPA. |
| **Bloqueo de IP por intentos** | El rate limiting actual es por IP, pero no persiste entre reinicios del servidor. En producción usaría Redis para mantener los contadores. |
| **Audit log** | Quién creó/modificó qué y cuándo. Muy valioso en un sistema educativo para cumplimiento. |
| **Revocación de tokens** | Una blacklist de JWTs revocados en Redis permitiría logout instantáneo en todos los dispositivos. |

---

## 6. Qué haría diferente con más tiempo

1. **Refresh tokens + cookies httpOnly**: la combinación más segura para SPAs. Actualmente uso `localStorage` para el JWT, que es vulnerable a XSS. Con cookies `httpOnly` el token es inaccesible desde JavaScript.
2. **Blacklist de tokens en Redis**: para logout inmediato en todos los dispositivos sin esperar la expiración natural del JWT.
3. **Cursor-based pagination**: la paginación por offset (`SKIP n`) es ineficiente en tablas grandes. Cambiaría a cursor-based pagination para consistencia y performance a escala.
4. **Soft delete**: en lugar de `DELETE` físico, marcar registros con `deletedAt` para auditoría y recuperación accidental. Esencial en un sistema educativo.
5. **Audit log completo**: tabla `audit_logs` que registre quién creó/modificó/eliminó qué y cuándo, con el payload del cambio.
6. **Rate limiting persistente con Redis**: el rate limiting actual se pierde en cada reinicio del servidor. Redis mantiene los contadores entre deploys.
7. **CI/CD pipeline**: GitHub Actions con lint + tests en cada PR, y deploy automático a Railway al hacer merge a `main`.

---

## 7. Diagrama de base de datos

```
┌─────────────────────────────────────┐
│              users                  │
├─────────────────────────────────────┤
│ id          String (PK, cuid)       │
│ nombre      String                  │
│ email       String (unique)         │
│ password    String (bcrypt hash)    │
│ role        ADMIN | OPERADOR        │
│ sedeId      String? (FK → sedes.id) │
│ createdAt   DateTime                │
│ updatedAt   DateTime                │
└────────────────┬────────────────────┘
                 │ 0..* users per sede
                 │
┌────────────────▼────────────────────┐
│              sedes                  │
├─────────────────────────────────────┤
│ id          String (PK, cuid)       │
│ nombre      String                  │
│ ciudad      String                  │
│ direccion   String                  │
│ activa      Boolean (default: true) │
│ createdAt   DateTime                │
│ updatedAt   DateTime                │
└────────────────┬────────────────────┘
                 │ 0..* estudiantes per sede
                 │
┌────────────────▼────────────────────┐
│           estudiantes               │
├─────────────────────────────────────┤
│ id               String (PK, cuid)  │
│ nombreCompleto   String             │
│ email            String (unique)    │
│ telefono         String             │
│ documento        String (unique)    │
│ sedeId           String (FK)        │
│ programa         String             │
│ estado           ACTIVO|INACTIVO    │
│                  |RETIRADO          │
│ fechaInscripcion DateTime           │
│ createdAt        DateTime           │
│ updatedAt        DateTime           │
└─────────────────────────────────────┘
```

**Relaciones:**
- `Sede` 1 → N `Estudiante` (una sede tiene muchos estudiantes)
- `Sede` 1 → N `User` (un OPERADOR pertenece a una sede)
- `User` ADMIN tiene `sedeId = null` (acceso a todas las sedes)

---

## 8. Comandos Git utilizados

```bash
# Setup inicial
git init
git remote add origin https://github.com/...

# Primera estructura
git checkout -b feat/project-setup
git add api/package.json api/tsconfig.json api/prisma/schema.prisma
git commit -m "chore: initialize api project with TypeScript and Prisma"

# Auth
git checkout -b feat/auth-jwt
git add api/src/controllers/auth.controller.ts api/src/middlewares/
git commit -m "feat(auth): implement JWT login with bcrypt, rate limiting, and generic error messages"

# Sedes
git checkout -b feat/sedes-crud
git commit -m "feat(sedes): add CRUD endpoints restricted to ADMIN role"

# Estudiantes
git checkout -b feat/estudiantes-crud
git commit -m "feat(estudiantes): add CRUD with role-based sede scoping for OPERADOR"
git commit -m "feat(stats): add aggregated stats endpoint using raw SQL queries"

# Frontend
git checkout -b feat/angular-frontend
git commit -m "feat(web): bootstrap Angular 20 standalone app with routing and HTTP interceptor"
git commit -m "feat(web): implement login page with JWT storage and auth guard"
git commit -m "feat(web): implement student list with sede filter and create modal"
git commit -m "feat(web): add admin dashboard with stats from aggregated API"

# Docs
git checkout -b docs/technical-docs
git commit -m "docs: add analisis_tecnico, git_respuestas, and complete README"

# Merge a main
git checkout main
git merge --no-ff feat/auth-jwt -m "feat(auth): merge JWT authentication"
# ... y así sucesivamente
```

---

## Bonus implementados

Todos los ítems opcionales de la prueba fueron implementados:

| Bonus | Implementación |
|-------|---------------|
| **Tests de integración** | Jest + Supertest, 28 tests que cubren auth, role scoping de estudiantes, y casos de error (409, 403, 404, 400) |
| **Swagger / OpenAPI** | Spec completo en `api/src/docs/swagger.ts`, disponible en `/api/docs` |
| **Logs estructurados** | `pino` con `pino-http` — JSON en producción, pretty en desarrollo, deshabilitado en test |
| **Paginación y búsqueda** | `GET /api/estudiantes?page=1&limit=20&search=ana&sedeId=x&estado=ACTIVO` |
| **Docker Compose** | `docker compose up --build` levanta PostgreSQL + API + Frontend con seed automático |
| **API externa** | `POST /api/external/import` consume `dummyjson.com/users`, importa como estudiantes, evita duplicados |
| **Frontend completo** | Edición de estudiantes, gestión de sedes, registro de usuarios, dashboard de stats |

---

## Endpoints de la API

| Método | Ruta                      | Auth | Roles             | Descripción                        |
|--------|---------------------------|------|-------------------|------------------------------------|
| POST   | /api/auth/login           | No   | —                 | Login, retorna JWT                 |
| POST   | /api/auth/register        | Sí   | ADMIN             | Crear usuario                      |
| GET    | /api/auth/me              | Sí   | ADMIN, OPERADOR   | Perfil del usuario autenticado     |
| GET    | /api/sedes                | Sí   | ADMIN, OPERADOR   | Listar sedes                       |
| POST   | /api/sedes                | Sí   | ADMIN             | Crear sede                         |
| PUT    | /api/sedes/:id            | Sí   | ADMIN             | Actualizar sede                    |
| DELETE | /api/sedes/:id            | Sí   | ADMIN             | Eliminar sede                      |
| GET    | /api/estudiantes          | Sí   | ADMIN, OPERADOR   | Listar (OPERADOR: solo su sede)    |
| POST   | /api/estudiantes          | Sí   | ADMIN, OPERADOR   | Crear (OPERADOR: solo su sede)     |
| GET    | /api/estudiantes/:id      | Sí   | ADMIN, OPERADOR   | Ver detalle                        |
| PUT    | /api/estudiantes/:id      | Sí   | ADMIN, OPERADOR   | Actualizar                         |
| DELETE | /api/estudiantes/:id      | Sí   | ADMIN, OPERADOR   | Eliminar                           |
| GET    | /api/stats                | Sí   | ADMIN             | Estadísticas agregadas por sede y estado |
| POST   | /api/external/import      | Sí   | ADMIN             | Importar estudiantes desde dummyjson.com |
| GET    | /api/docs                 | No   | —                 | Swagger UI interactivo             |
| GET    | /health                   | No   | —                 | Health check                       |
