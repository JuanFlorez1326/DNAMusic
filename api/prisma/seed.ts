import { PrismaClient, Role, EstadoEstudiante } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const bogota = await prisma.sede.upsert({
    where: { id: 'sede-bogota' },
    update: {},
    create: {
      id: 'sede-bogota',
      nombre: 'DNA Music Bogotá',
      ciudad: 'Bogotá',
      direccion: 'Calle 100 # 15-20, Usaquén',
      activa: true,
    },
  });

  const medellin = await prisma.sede.upsert({
    where: { id: 'sede-medellin' },
    update: {},
    create: {
      id: 'sede-medellin',
      nombre: 'DNA Music Medellín',
      ciudad: 'Medellín',
      direccion: 'Carrera 43A # 1-50, El Poblado',
      activa: true,
    },
  });

  const cali = await prisma.sede.upsert({
    where: { id: 'sede-cali' },
    update: {},
    create: {
      id: 'sede-cali',
      nombre: 'DNA Music Cali',
      ciudad: 'Cali',
      direccion: 'Avenida 6N # 23-45, Granada',
      activa: true,
    },
  });

  console.log('Sedes created:', bogota.nombre, medellin.nombre, cali.nombre);

  const SALT_ROUNDS = 12;

  const adminPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS);
  const operPassword = await bcrypt.hash('Oper123!', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dnamusic.co' },
    update: {},
    create: {
      nombre: 'Administrador General',
      email: 'admin@dnamusic.co',
      password: adminPassword,
      role: Role.ADMIN,
      sedeId: null,
    },
  });

  const operBog = await prisma.user.upsert({
    where: { email: 'operador.bog@dnamusic.co' },
    update: {},
    create: {
      nombre: 'Operador Bogotá',
      email: 'operador.bog@dnamusic.co',
      password: operPassword,
      role: Role.OPERADOR,
      sedeId: bogota.id,
    },
  });

  const operMed = await prisma.user.upsert({
    where: { email: 'operador.med@dnamusic.co' },
    update: {},
    create: {
      nombre: 'Operador Medellín',
      email: 'operador.med@dnamusic.co',
      password: operPassword,
      role: Role.OPERADOR,
      sedeId: medellin.id,
    },
  });

  console.log('Users created:', admin.email, operBog.email, operMed.email);

  const estudiantes = [
    {
      nombreCompleto: 'Ana María López',
      email: 'ana.lopez@gmail.com',
      telefono: '3001234567',
      documento: '1020304050',
      sedeId: bogota.id,
      programa: 'Piano Clásico',
      estado: EstadoEstudiante.ACTIVO,
    },
    {
      nombreCompleto: 'Carlos Andrés Ruiz',
      email: 'carlos.ruiz@gmail.com',
      telefono: '3109876543',
      documento: '1030405060',
      sedeId: bogota.id,
      programa: 'Guitarra Eléctrica',
      estado: EstadoEstudiante.ACTIVO,
    },
    {
      nombreCompleto: 'Valentina Torres',
      email: 'valentina.torres@gmail.com',
      telefono: '3205556677',
      documento: '1040506070',
      sedeId: medellin.id,
      programa: 'Canto Lírico',
      estado: EstadoEstudiante.ACTIVO,
    },
    {
      nombreCompleto: 'Sebastián Gómez',
      email: 'sebastian.gomez@gmail.com',
      telefono: '3157778899',
      documento: '1050607080',
      sedeId: medellin.id,
      programa: 'Batería',
      estado: EstadoEstudiante.INACTIVO,
    },
    {
      nombreCompleto: 'Mariana Herrera',
      email: 'mariana.herrera@gmail.com',
      telefono: '3001112233',
      documento: '1060708090',
      sedeId: cali.id,
      programa: 'Violín',
      estado: EstadoEstudiante.ACTIVO,
    },
    {
      nombreCompleto: 'Diego Fernando Mora',
      email: 'diego.mora@gmail.com',
      telefono: '3184445566',
      documento: '1070809010',
      sedeId: cali.id,
      programa: 'Bajo Eléctrico',
      estado: EstadoEstudiante.RETIRADO,
    },
  ];

  for (const est of estudiantes) {
    await prisma.estudiante.upsert({
      where: { email: est.email },
      update: {},
      create: est,
    });
  }

  console.log(`${estudiantes.length} estudiantes created.`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
