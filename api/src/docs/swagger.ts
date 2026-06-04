export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DNA Music API',
    version: '1.0.0',
    description:
      'Sistema de Gestión de Estudiantes por Sede — DNA Music ERP.\n\n' +
      '**Credenciales de prueba:**\n' +
      '- ADMIN: `admin@dnamusic.co` / `Admin123!`\n' +
      '- Operador BOG: `operador.bog@dnamusic.co` / `Oper123!`',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local' },
    { url: 'https://dnamusic-api.railway.app', description: 'Producción' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nombre: { type: 'string', example: 'Administrador General' },
          email: { type: 'string', example: 'admin@dnamusic.co' },
          role: { type: 'string', enum: ['ADMIN', 'OPERADOR'] },
          sedeId: { type: 'string', nullable: true },
        },
      },
      Sede: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nombre: { type: 'string', example: 'DNA Music Bogotá' },
          ciudad: { type: 'string', example: 'Bogotá' },
          direccion: { type: 'string', example: 'Calle 100 # 15-20' },
          activa: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Estudiante: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nombreCompleto: { type: 'string', example: 'Ana María López' },
          email: { type: 'string', example: 'ana@gmail.com' },
          telefono: { type: 'string', example: '3001234567' },
          documento: { type: 'string', example: '1020304050' },
          sedeId: { type: 'string' },
          programa: { type: 'string', example: 'Piano Clásico' },
          estado: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'RETIRADO'] },
          fechaInscripcion: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@dnamusic.co' },
                  password: { type: 'string', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciales inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Demasiados intentos (rate limiting)' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar usuario (solo ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'email', 'password', 'role'],
                properties: {
                  nombre: { type: 'string', example: 'Nuevo Operador' },
                  email: { type: 'string', example: 'nuevo@dnamusic.co' },
                  password: { type: 'string', example: 'Password123!' },
                  role: { type: 'string', enum: ['ADMIN', 'OPERADOR'] },
                  sedeId: { type: 'string', description: 'Requerido si role=OPERADOR' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuario creado' },
          400: { description: 'Datos inválidos o OPERADOR sin sede' },
          401: { description: 'No autenticado' },
          403: { description: 'Solo ADMIN puede registrar usuarios' },
          409: { description: 'Email ya registrado' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener perfil del usuario autenticado',
        responses: {
          200: { description: 'Perfil', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'No autenticado' },
        },
      },
    },

    '/api/sedes': {
      get: {
        tags: ['Sedes'],
        summary: 'Listar todas las sedes',
        responses: {
          200: {
            description: 'Lista de sedes',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Sede' } } } },
          },
        },
      },
      post: {
        tags: ['Sedes'],
        summary: 'Crear sede (solo ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'ciudad', 'direccion'],
                properties: {
                  nombre: { type: 'string', example: 'DNA Music Barranquilla' },
                  ciudad: { type: 'string', example: 'Barranquilla' },
                  direccion: { type: 'string', example: 'Calle 72 # 57-30' },
                  activa: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Sede creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sede' } } } },
          400: { description: 'Datos inválidos' },
          403: { description: 'Solo ADMIN' },
        },
      },
    },
    '/api/sedes/{id}': {
      get: {
        tags: ['Sedes'],
        summary: 'Obtener sede por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Sede', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sede' } } } },
          404: { description: 'No encontrada' },
        },
      },
      put: {
        tags: ['Sedes'],
        summary: 'Actualizar sede (solo ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  ciudad: { type: 'string' },
                  direccion: { type: 'string' },
                  activa: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Sede actualizada' },
          403: { description: 'Solo ADMIN' },
          404: { description: 'No encontrada' },
        },
      },
      delete: {
        tags: ['Sedes'],
        summary: 'Eliminar sede (solo ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Eliminada' },
          403: { description: 'Solo ADMIN' },
          404: { description: 'No encontrada' },
          409: { description: 'Tiene estudiantes asociados' },
        },
      },
    },

    '/api/estudiantes': {
      get: {
        tags: ['Estudiantes'],
        summary: 'Listar estudiantes (OPERADOR ve solo su sede)',
        parameters: [
          { name: 'sedeId', in: 'query', schema: { type: 'string' }, description: 'Solo ADMIN' },
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'RETIRADO'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Busca en nombre, email, documento' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Estudiante' } },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Estudiantes'],
        summary: 'Crear estudiante',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombreCompleto', 'email', 'telefono', 'documento', 'sedeId', 'programa'],
                properties: {
                  nombreCompleto: { type: 'string', example: 'María García' },
                  email: { type: 'string', example: 'maria@gmail.com' },
                  telefono: { type: 'string', example: '3001234567' },
                  documento: { type: 'string', example: '1099887766' },
                  sedeId: { type: 'string' },
                  programa: { type: 'string', example: 'Guitarra Clásica' },
                  estado: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'RETIRADO'], default: 'ACTIVO' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Estudiante creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estudiante' } } } },
          400: { description: 'Datos inválidos' },
          403: { description: 'OPERADOR no puede crear en otra sede' },
          409: { description: 'Email o documento duplicado' },
        },
      },
    },
    '/api/estudiantes/{id}': {
      get: {
        tags: ['Estudiantes'],
        summary: 'Obtener estudiante por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Estudiante', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estudiante' } } } },
          403: { description: 'OPERADOR sin acceso a esta sede' },
          404: { description: 'No encontrado' },
        },
      },
      put: {
        tags: ['Estudiantes'],
        summary: 'Actualizar estudiante',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombreCompleto: { type: 'string' },
                  email: { type: 'string' },
                  telefono: { type: 'string' },
                  programa: { type: 'string' },
                  estado: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'RETIRADO'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Actualizado' },
          403: { description: 'Sin acceso' },
          404: { description: 'No encontrado' },
        },
      },
      delete: {
        tags: ['Estudiantes'],
        summary: 'Eliminar estudiante',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Eliminado' },
          403: { description: 'Sin acceso' },
          404: { description: 'No encontrado' },
        },
      },
    },

    '/api/stats': {
      get: {
        tags: ['Estadísticas'],
        summary: 'Estadísticas agregadas (solo ADMIN)',
        responses: {
          200: {
            description: 'Estadísticas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalPorSede: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          sede: { $ref: '#/components/schemas/Sede' },
                          total: { type: 'integer' },
                        },
                      },
                    },
                    totalPorEstado: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          estado: { type: 'string' },
                          total: { type: 'integer' },
                        },
                      },
                    },
                    sedeConMasActivos: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        sede: { $ref: '#/components/schemas/Sede' },
                        totalActivos: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: 'Solo ADMIN' },
        },
      },
    },

    '/api/external/import': {
      post: {
        tags: ['Externo'],
        summary: 'Importar usuarios desde DummyJSON y registrarlos como estudiantes (solo ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sedeId'],
                properties: {
                  sedeId: { type: 'string', description: 'Sede a la que se asignarán los estudiantes importados' },
                  limit: { type: 'integer', default: 5, description: 'Cuántos usuarios importar (máx 20)' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Estudiantes importados', content: { 'application/json': { schema: { type: 'object', properties: { imported: { type: 'integer' }, skipped: { type: 'integer' } } } } } },
          400: { description: 'Sede inválida' },
          403: { description: 'Solo ADMIN' },
        },
      },
    },

    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        security: [],
        responses: {
          200: { description: 'API funcionando', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' } } } } } },
        },
      },
    },
  },
};
