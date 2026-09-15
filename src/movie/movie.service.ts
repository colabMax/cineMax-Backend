import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MovieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScopeService: AccessScopeService,
  ) {};

  async create(dto: CreateMovieDto, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const movieCinemaId = cinemaId ?? dto.cinemaId;

    if (!movieCinemaId) {
      throw new BadRequestException('El cinemaId es obligatorio para un SuperAdmin');
    };

    return await this.prisma.movie.create({
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        rating: dto.rating,
        releaseDate: dto.releaseDate,
        genre: dto.genre,
        posterUrl: dto.posterUrl,
        trailerUrl: dto.trailerUrl,
        cinemaId: movieCinemaId,
      }
    })
  }

  async findAll(user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    return this.prisma.movie.findMany({
      where: cinemaId ? { cinemaId } : undefined,
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
        },
        createdAt: true,
      }
    })
  }

  async findById(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const movie = await this.prisma.movie.findFirst({
      where: {
        id,
        ...(cinemaId !== null && { cinemaId }),
      }
    })

    if (!movie) {
      throw new NotFoundException('Pelicula no encontrada');
    }

    return movie;
  }

  async update(id: string, dto: UpdateMovieDto, user: JwtPayload) {

    await this.findById(id, user);

    return this.prisma.movie.update({
      where: { id },
      data: dto
    })
  }

  async delete(id: string, user: JwtPayload) {
    await this.findById(id, user);

    return this.prisma.movie.delete({
      where: { id }
    })
  }

}
