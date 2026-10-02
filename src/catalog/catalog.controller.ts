import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const movieSelect = {
  id: true, title: true, description: true, duration: true, posterUrl: true,
  trailerUrl: true, rating: true, releaseDate: true, genre: true, cinemaId: true,
} as const;

@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('cinemaId') cinemaId?: string) {
    const cinemas = await this.prisma.cinema.findMany({
      select: { id: true, name: true, address: true }, orderBy: { name: 'asc' },
    });
    const activeCinema = cinemas.find(c => c.id === cinemaId) ?? cinemas[0] ?? null;
    if (!activeCinema) return { cinemas, activeCinema: null, movies: [] };
    const movies = await this.prisma.movie.findMany({
      where: { cinemaId: activeCinema.id }, orderBy: { title: 'asc' },
      select: { ...movieSelect, showtimes: {
        where: { startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' },
        select: { id: true, startTime: true, room: { select: { id: true, name: true } } },
      } },
    });
    return { cinemas, activeCinema, movies };
  }

  @Get('movie/:id')
  async movie(@Param('id') id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      select: { ...movieSelect, showtimes: {
        where: { startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' },
        select: { id: true, startTime: true, room: { select: { id: true, name: true } } },
      } },
    });
    if (!movie) throw new NotFoundException('Película no encontrada');
    return movie;
  }
}
