const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { seedMovies } = require('./seed-movies.cjs');
const { randomBytes } = require('node:crypto');

async function main() {
  const cinemaId = process.env.SEED_CINEMA_ID || '6d08c46d-792a-44b6-a427-3827cfc00001';
  const name = process.env.SEED_CINEMA_NAME || 'CineMax Central';
  const address = process.env.SEED_CINEMA_ADDRESS || 'Centro';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@cinemax.test').trim().toLowerCase();
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador CineMax';
  const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(24).toString('base64url') + 'Aa1!';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cinemaId)) throw new Error('SEED_CINEMA_ID debe ser un UUID.');
  if (!name.trim() || name.length > 50 || !address.trim() || address.length > 50) throw new Error('Nombre y dirección del cine: entre 1 y 50 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('SEED_ADMIN_EMAIL no es válido.');
  if (!adminName.trim()) throw new Error('El nombre del administrador es obligatorio.');
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes.');
  const hash = await bcrypt.hash(password, 12);
  const prisma = new PrismaClient();
  try {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await prisma.$transaction(async tx => {
          const existing = await tx.user.findUnique({ where: { email } });
          if (existing && (existing.role !== 'ADMIN_CINEMA' || existing.cinemaId !== cinemaId || existing.authProvider !== 'LOCAL')) {
            throw new Error('Ese correo ya pertenece a otra cuenta. El seed no cambia su rol, cine ni contraseña.');
          }
          const assigned = await tx.user.findFirst({ where: { cinemaId, role: 'ADMIN_CINEMA', email: { not: email } } });
          if (assigned) throw new Error('El cine ya tiene otro administrador. No se reemplazará.');
          const cinema = await tx.cinema.upsert({
            where: { id: cinemaId }, update: {},
            create: { id: cinemaId, name: name.trim(), address: address.trim() },
          });
          const admin = existing ?? await tx.user.create({
            data: { name: adminName.trim(), email, password: hash, authProvider: 'LOCAL', role: 'ADMIN_CINEMA', cinemaId, emailVerified: true },
          });
          const movies = await seedMovies(tx, cinemaId);
          return { cinema, admin, movies, created: !existing };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
        break;
      } catch (error) {
        if (error.code === 'P2034' && attempt < 2) continue;
        throw error;
      }
    }
    console.log(JSON.stringify({
      cinema: { id: result.cinema.id, name: result.cinema.name, address: result.cinema.address },
      admin: { email: result.admin.email, role: result.admin.role, emailVerified: result.admin.emailVerified },
      created: result.created,
      movies: result.movies,
      ...(result.created ? { password } : { message: 'Seed existente: se conservaron los datos y la contraseña.' }),
    }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => {
  // No imprimir detalles de Prisma que puedan incluir la conexión o contraseñas.
  console.error(error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError
    ? 'No se pudo completar el seed. Revisá la conexión y las migraciones.'
    : error.message);
  process.exitCode = 1;
});
