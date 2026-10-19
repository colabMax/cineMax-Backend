import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { CreateShowtimeBulkDto } from './dto/create-showtime-bulk.dto';

@Injectable()
export class ShowtimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScopeService: AccessScopeService,
  ) {}

  async create(dto: CreateShowtimeDto, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const movie = await this.prisma.movie.findFirst({
      where: {
        id: dto.movieId,
        ...(cinemaId !== null && { cinemaId }),
      },
    });

    if (!movie) {
      throw new NotFoundException('Película no encontrada');
    }

    const room = await this.prisma.room.findFirst({
      where: {
        id: dto.roomId,
        ...(cinemaId !== null && { cinemaId }),
      },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    if (room.cinemaId !== movie.cinemaId) {
      throw new BadRequestException(
        'La película y la sala no pertenecen al mismo cine',
      );
    }

    return this.prisma.showtime.create({
      data: {
        movieId: dto.movieId,
        roomId: dto.roomId,
        startTime: dto.startTime,
      },
    });
  }

  /**
   * Crea varias funciones de una película en una sala, en una sola transacción.
   * Detecta superposiciones con las funciones existentes de la sala y entre las del lote
   * (usando la duración de cada película). Con skipConflicts las saltea y las informa;
   * sin skipConflicts rechaza el lote entero.
   */
  async createBulk(dto: CreateShowtimeBulkDto, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const movie = await this.prisma.movie.findFirst({
      where: { id: dto.movieId, ...(cinemaId !== null && { cinemaId }) },
    });
    if (!movie) {
      throw new NotFoundException('Película no encontrada');
    }

    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, ...(cinemaId !== null && { cinemaId }) },
    });
    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }
    if (room.cinemaId !== movie.cinemaId) {
      throw new BadRequestException('La película y la sala no pertenecen al mismo cine');
    }

    const minute = 60_000;
    const requested = [...new Set(dto.startTimes.map((date) => new Date(date).getTime()))].sort((a, b) => a - b);
    const from = new Date(requested[0] - 24 * 60 * minute);
    const to = new Date(requested[requested.length - 1] + movie.duration * minute);

    const existing = await this.prisma.showtime.findMany({
      where: { roomId: room.id, startTime: { gte: from, lte: to } },
      select: { startTime: true, movie: { select: { title: true, duration: true } } },
    });

    const busy = existing.map((showtime) => ({
      start: showtime.startTime.getTime(),
      end: showtime.startTime.getTime() + showtime.movie.duration * minute,
      title: showtime.movie.title,
    }));

    const accepted: Date[] = [];
    const skipped: { startTime: string; reason: string }[] = [];
    for (const start of requested) {
      const end = start + movie.duration * minute;
      const clash = busy.find((slot) => start < slot.end && slot.start < end);
      if (clash) {
        skipped.push({ startTime: new Date(start).toISOString(), reason: `Se superpone con ${clash.title}` });
        continue;
      }
      accepted.push(new Date(start));
      busy.push({ start, end, title: movie.title });
    }

    if (skipped.length > 0 && !dto.skipConflicts) {
      throw new ConflictException({
        message: `${skipped.length} de ${requested.length} funciones se superponen con otras de la sala.`,
        skipped,
      });
    }

    if (accepted.length > 0) {
      await this.prisma.$transaction(
        accepted.map((startTime) =>
          this.prisma.showtime.create({ data: { movieId: movie.id, roomId: room.id, startTime } }),
        ),
      );
    }

    return { created: accepted.length, skipped };
  }

  findAll(user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    return this.prisma.showtime.findMany({
      where: { ...(cinemaId !== null && { movie: { cinemaId } }) },
      select: {
        id: true,
        startTime: true,
        createdAt: true,
        movie: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            posterUrl: true,
            trailerUrl: true,
            rating: true,
            releaseDate: true,
            genre: true,
            cinema: {
              select: {
                id: true,
                name: true,
              }
            }
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findById(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const showtime = await this.prisma.showtime.findUnique({
      where: {
        id,
        ...(cinemaId !== null && { movie: { cinemaId } }),
      },
      select: {
        id: true,
        startTime: true,
        createdAt: true,
        movie: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            posterUrl: true,
            trailerUrl: true,
            rating: true,
            releaseDate: true,
            genre: true,
            cinema: {
              select: {
                id: true,
                name: true,
              }
            }
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime no encontrada');
    }

    return showtime;
  }

  async update(id: string, dto: UpdateShowtimeDto, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    await this.findById(id, user);

    return this.prisma.showtime.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    await this.findById(id, user);

    return this.prisma.showtime.delete({
      where: { id },
    });
  }
}
