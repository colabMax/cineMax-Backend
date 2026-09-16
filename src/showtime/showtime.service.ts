import {
  BadRequestException,
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
        startTime: dto.startTime,
      },
    });
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

  findById(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const showtime = this.prisma.showtime.findUnique({
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
