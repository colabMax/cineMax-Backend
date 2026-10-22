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
      },
    });
  }

  findAll(user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaIdForRead(user);

    return this.prisma.showtime.findMany({
      where: { ...(cinemaId !== null && { movie: { cinemaId } }) },
      select: {
        id: true,
        price: true,
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
