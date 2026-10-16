const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomBytes } = require('node:crypto');

const prisma = new PrismaClient();

async function main() {
  const cinemaId = process.env.SEED_CINEMA_ID || '6d08c46d-792a-44b6-a427-3827cfc00001';
  const definitions = [
    { email: 'superadmin@cinemax.test', name: 'Superadministrador CineMax', role: 'SUPER_ADMIN', cinemaId: null },
    { email: 'admin@cinemax.test', name: 'Administrador CineMax', role: 'ADMIN_CINEMA', cinemaId },
    { email: 'operador@cinemax.test', name: 'Operador CineMax', role: 'OPERATOR', cinemaId },
    { email: 'cliente@cinemax.test', name: 'Cliente CineMax', role: 'CLIENT', cinemaId: null },
  ];
  const accounts = await Promise.all(definitions.map(async definition => {
    const password = randomBytes(18).toString('base64url') + 'Aa1!';
    return { ...definition, plainPassword: password, password: await bcrypt.hash(password, 12) };
  }));

  let results;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      results = await prisma.$transaction(async tx => {
        const cinema = await tx.cinema.findUnique({ where: { id: cinemaId } });
        if (!cinema) throw new Error('No existe el cine. Ejecutá primero el seed original o definí SEED_CINEMA_ID.');
        const output = [];
        for (const account of accounts) {
          const existing = await tx.user.findUnique({ where: { email: account.email } });
          if (existing) {
            if (existing.role !== account.role || existing.cinemaId !== account.cinemaId || existing.authProvider !== 'LOCAL') {
              throw new Error(`La cuenta ${account.email} tiene otro rol, cine o proveedor. No se modificó.`);
            }
            output.push({ email: existing.email, role: existing.role, created: false, message: 'Cuenta existente: contraseña conservada.' });
            continue;
          }
          if (account.role === 'ADMIN_CINEMA') {
            const assigned = await tx.user.findFirst({ where: { cinemaId, role: 'ADMIN_CINEMA' } });
            if (assigned) {
              output.push({ email: assigned.email, role: assigned.role, created: false, message: 'Se conserva el administrador actual del cine y su contraseña.' });
              continue;
            }
          }
          const { plainPassword, ...data } = account;
          const user = await tx.user.create({ data: { ...data, authProvider: 'LOCAL', emailVerified: true, profileCompleted: true } });
          output.push({ email: user.email, role: user.role, created: true, password: plainPassword });
        }
        return output;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
      break;
    } catch (error) {
      if (error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => {
  console.error(error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError
    ? 'No se pudo completar el seed. Revisá la conexión y las migraciones.'
    : error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
