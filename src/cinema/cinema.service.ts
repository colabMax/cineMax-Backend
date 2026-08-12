import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';

@Injectable()
export class CinemaService {
  constructor(private prisma: PrismaService) {}

  async createCinema(createCinemaDto: CreateCinemaDto) {
    return this.prisma.cinema.create({
      data: {
        name: createCinemaDto.name,
        address: createCinemaDto.address,
      },
    });
  }

  async getAllCinemas() {
    return this.prisma.cinema.findMany({
      orderBy: {
        createdAt: 'desc',
      }
    })
  }

  async getCinemaById(id: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: {
        id
      }
    })

    if (!cinema) {
      throw new NotFoundException(`Cine con id ${id} no encontrado`);
    }

    return cinema;
  }
}
