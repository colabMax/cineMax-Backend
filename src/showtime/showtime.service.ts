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
        price: dto.price,
        startTime: dto.startTime,
        ...(dto.language && { language: dto.language }),
      },
    });
  }

  /**
   * Crea varias funciones de una película en una sola transacción. Cada una puede ir en
   * una sala y versión distintas. Detecta superposiciones por sala, con las funciones que
   * ya existen y entre las del lote (usando la duración de cada película). Con skipConflicts
   * las saltea y las informa; sin skipConflicts rechaza el lote entero.
   */
  async createBulk(dto: CreateShowtimeBulkDto, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const movie = await this.prisma.movie.findFirst({
      where: { id: dto.movieId, ...(cinemaId !== null && { cinemaId }) },
    });
    if (!movie) {
      throw new NotFoundException('Película no encontrada');
    }

    const roomIds = [...new Set(dto.items.map((item) => item.roomId))];
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds }, cinemaId: movie.cinemaId },
      select: { id: true, name: true },
    });
    if (rooms.length !== roomIds.length) {
      throw new BadRequestException('Alguna de las salas no existe o no es del cine de la película');
    }
    const roomName = new Map(rooms.map((room) => [room.id, room.name]));

    const minute = 60_000;
    const seen = new Set<string>();
    const requested = dto.items
      .map((item) => ({ ...item, start: new Date(item.startTime).getTime() }))
      .filter((item) => {
        const key = `${item.roomId}|${item.start}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.start - b.start);

    const from = new Date(requested[0].start - 24 * 60 * minute);
    const to = new Date(requested[requested.length - 1].start + movie.duration * minute);
    const existing = await this.prisma.showtime.findMany({
      where: { roomId: { in: roomIds }, startTime: { gte: from, lte: to } },
      select: { roomId: true, startTime: true, movie: { select: { title: true, duration: true } } },
    });

    const busy = existing.map((showtime) => ({
      roomId: showtime.roomId,
      start: showtime.startTime.getTime(),
      end: showtime.startTime.getTime() + showtime.movie.duration * minute,
      title: showtime.movie.title,
    }));

    const accepted: typeof requested = [];
    const skipped: { startTime: string; roomId: string; reason: string }[] = [];
    for (const item of requested) {
      const end = item.start + movie.duration * minute;
      const clash = busy.find(
        (slot) => slot.roomId === item.roomId && item.start < slot.end && slot.start < end,
      );
      if (clash) {
        skipped.push({
          startTime: new Date(item.start).toISOString(),
          roomId: item.roomId,
          reason: `${roomName.get(item.roomId)}: se superpone con ${clash.title}`,
        });
        continue;
      }
      accepted.push(item);
      busy.push({ roomId: item.roomId, start: item.start, end, title: movie.title });
    }

    if (skipped.length > 0 && !dto.skipConflicts) {
      throw new ConflictException({
        message: `${skipped.length} de ${requested.length} funciones se superponen con otras de la sala.`,
        skipped,
      });
    }

    if (accepted.length > 0) {
      await this.prisma.$transaction(
        accepted.map((item) =>
          this.prisma.showtime.create({
            data: {
              movieId: movie.id,
              roomId: item.roomId,
              price: item.price ?? dto.price,
              startTime: new Date(item.start),
              ...(item.language && { language: item.language }),
            },
          }),
        ),
      );
    }

    return { created: accepted.length, skipped };
  }

  findAll(user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaIdForRead(user);

    return this.prisma.showtime.findMany({
      where: { ...(cinemaId !== null && { movie: { cinemaId } }) },
      select: {
        id: true,
        price: true,
        startTime: true,
        language: true,
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
              },
            },
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
    const cinemaId = this.accessScopeService.getCinemaIdForRead(user);

    const showtime = await this.prisma.showtime.findFirst({
      where: {
        id,
        ...(cinemaId !== null && { movie: { cinemaId } }),
      },
      select: {
        id: true,
        price: true,
        startTime: true,
        language: true,
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
              },
            },
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

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Showtime" WHERE "id" = ${id} FOR UPDATE
      `;

      const showtime = await tx.showtime.findFirst({
        where: {
          id,
          ...(cinemaId !== null && { movie: { cinemaId } }),
        },
      });

      if (!showtime) {
        throw new NotFoundException('Showtime no encontrada');
      }

      if (dto.roomId && dto.roomId !== showtime.roomId) {
        const movie = await tx.movie.findUnique({
          where: { id: showtime.movieId },
          select: { cinemaId: true },
        });
        const room = await tx.room.findFirst({
          where: { id: dto.roomId, cinemaId: movie?.cinemaId },
        });
        if (!room) {
          throw new BadRequestException(
            'La sala no existe o no es del cine de la película',
          );
        }
      }

      const now = new Date();
      await tx.seatHold.updateMany({
        where: {
          showtimeId: id,
          status: 'PENDING',
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      });

      const [ticketCount, activeHoldCount] = await Promise.all([
        tx.ticket.count({ where: { showtimeId: id } }),
        tx.seatHold.count({
          where: {
            showtimeId: id,
            status: 'PENDING',
            expiresAt: { gt: now },
          },
        }),
      ]);

      if (ticketCount > 0 || activeHoldCount > 0) {
        throw new ConflictException(
          'No se puede modificar una función con tickets o reservas activas',
        );
      }

      return tx.showtime.update({
        where: { id },
        data: dto,
      });
    });
  }

  async delete(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Showtime" WHERE "id" = ${id} FOR UPDATE
      `;

      const showtime = await tx.showtime.findFirst({
        where: {
          id,
          ...(cinemaId !== null && { movie: { cinemaId } }),
        },
      });

      if (!showtime) {
        throw new NotFoundException('Showtime no encontrada');
      }

      const now = new Date();
      await tx.seatHold.updateMany({
        where: {
          showtimeId: id,
          status: 'PENDING',
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      });

      const [orderCount, holdCount, ticketCount] = await Promise.all([
        tx.order.count({ where: { showtimeId: id } }),
        tx.seatHold.count({ where: { showtimeId: id } }),
        tx.ticket.count({ where: { showtimeId: id } }),
      ]);

      if (orderCount > 0 || holdCount > 0 || ticketCount > 0) {
        throw new ConflictException(
          'No se puede eliminar una función con historial de compras, reservas o tickets',
        );
      }

      await tx.showtime.delete({ where: { id } });
      return showtime;
    });
  }
}
