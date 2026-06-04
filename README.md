# DNA Music — Sistema de Gestión de Estudiantes

ERP modular para DNA Music. Este módulo cubre gestión de estudiantes por sede con autenticación basada en roles (ADMIN / OPERADOR).

---

## 1. Cómo correr el proyecto localmente

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ corriendo localmente **O** Docker + Docker Compose

### Opción A — Con Docker Compose (recomendado, un solo comando)

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Esto levanta:
- PostgreSQL en el puerto 5432
- API en http://localhost:3000
- Frontend en http://localhost:4200

El seed se ejecuta automáticamente. Listo.

---

### Opción B — Manual

**1. Backend**

```bash
cd api
cp .env.example .env
# Edita .env con tu DATABASE_URL de PostgreSQL
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

**2. Frontend**

```bash
cd web
npm install
npm start
```

El frontend queda en http://localhost:4200 y llama al backend en http://localhost:3000.

---

## 2. URLs de despliegue

| Servicio   | URL                                    |
|------------|----------------------------------------|
| Backend    | `https://dnamusic-api.railway.app`     |
| Frontend   | `https://dnamusic-web.vercel.app`      |

> Reemplazar con las URLs reales una vez desplegado. El backend se despliega en Railway (PostgreSQL incluido), el frontend en Vercel.

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

Elegí Express sobre NestJS para mantener el proyecto simple y sin magia implícita. Para una prueba técnica es más fácil de explicar cada línea que con los decoradores de NestJS. En producción a escala elegiría NestJS.

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

1. **Tests de integración**: con `supertest` + una base de datos de test, cubriría los flujos críticos de auth y scope de roles. Los bugs de "el operador accede a otra sede" son exactamente el tipo que los tests atraparían.
2. **Swagger/OpenAPI**: `swagger-jsdoc` + `swagger-ui-express` para documentar todos los endpoints con ejemplos de request/response.
3. **Logs estructurados**: `pino` en lugar de `console.log`, con correlation IDs por request, para poder trazar un request desde el frontend hasta la query de base de datos.
4. **Refresh tokens + cookies httpOnly**: la combinación más segura para SPAs.
5. **Soft delete**: en lugar de `delete`, marcar registros con `deletedAt` para auditoría y recuperación accidental.
6. **Paginación en cursor**: la paginación por offset (`SKIP n`) es ineficiente en tablas grandes. Cambiaría a cursor-based pagination.
7. **Frontend más completo**: edición de estudiantes, gestión de sedes desde la UI, vista de perfil de usuario.

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
| GET    | /api/stats                | Sí   | ADMIN             | Estadísticas agregadas             |
| GET    | /health                   | No   | —                 | Health check                       |
