const { PrismaClient, Prisma } = require('@prisma/client');
const { createHash } = require('node:crypto');

// Catálogo ficticio para desarrollo. Los datos se guardan en la base.
const movies = [
  { key: 'ultimo-tren', title: 'El último tren', description: 'Una conductora debe reunir a un grupo de desconocidos para completar el último viaje antes del cierre de una línea ferroviaria.', duration: 112, rating: 8.1, releaseDate: '2026-01-15', genre: ['Drama', 'Suspenso'] },
  { key: 'orbita-perdida', title: 'Órbita perdida', description: 'Una tripulación recibe una señal inesperada mientras intenta volver a casa desde una estación situada al otro lado del sistema solar.', duration: 128, rating: 8.5, releaseDate: '2026-02-12', genre: ['Ciencia ficción', 'Aventura'] },
  { key: 'verano-sur', title: 'Verano en el sur', description: 'Dos amigos vuelven al pueblo donde crecieron y descubren que todavía tienen una promesa pendiente.', duration: 98, rating: 7.6, releaseDate: '2026-03-05', genre: ['Comedia', 'Romance'] },
  { key: 'bosque-luces', title: 'El bosque de las luces', description: 'Una niña y un pequeño guardián del bosque emprenden un viaje para recuperar las estrellas que desaparecieron del cielo.', duration: 91, rating: 8.2, releaseDate: '2026-04-09', genre: ['Animación', 'Fantasía'] },
  { key: 'casa-niebla', title: 'La casa en la niebla', description: 'Una restauradora llega a una casa aislada donde cada habitación parece conservar recuerdos de personas que nunca vivieron allí.', duration: 105, rating: 7.4, releaseDate: '2026-05-14', genre: ['Terror', 'Misterio'] },
  { key: 'ruta-final', title: 'Ruta final', description: 'Un mensajero y una mecánica atraviesan el país para entregar una prueba que puede detener una peligrosa organización.', duration: 119, rating: 7.9, releaseDate: '2026-06-18', genre: ['Acción', 'Aventura'] },
];

function movieId(cinemaId, key) {
  const hex = createHash('sha256').update('cinemax-seed-movie:' + cinemaId + ':' + key).digest('hex');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-8' + hex.slice(13, 16) + '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
}

async function seedMovies(database, cinemaId) {
  const cinema = await database.cinema.findUnique({ where: { id: cinemaId }, select: { id: true, name: true } });
  if (!cinema) throw new Error('No existe el cine indicado. Ejecutá pnpm run seed o configurá SEED_CINEMA_ID con un cine existente.');
  const data = movies.map(({ key, releaseDate, ...movie }) => ({
    ...movie,
    id: movieId(cinemaId, key),
    cinemaId,
    releaseDate: new Date(releaseDate + 'T00:00:00.000Z'),
    posterUrl: null,
    trailerUrl: null,
  }));
  // No sobrescribir películas que el usuario ya haya editado.
  const result = await database.movie.createMany({ data, skipDuplicates: true });
  return { cinema: cinema.name, created: result.count, existing: data.length - result.count, total: data.length };
}

async function main() {
  const cinemaId = process.env.SEED_CINEMA_ID || '6d08c46d-792a-44b6-a427-3827cfc00001';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cinemaId)) throw new Error('SEED_CINEMA_ID debe ser un UUID.');
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(tx => seedMovies(tx, cinemaId), { timeout: 15000 });
    console.log(JSON.stringify(result, null, 2));
  } finally { await prisma.$disconnect(); }
}

module.exports = { seedMovies };
if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError
      ? 'No se pudo completar el seed de películas. Revisá la conexión y las migraciones.'
      : error.message);
    process.exitCode = 1;
  });
}
