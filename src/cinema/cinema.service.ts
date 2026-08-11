import { Injectable } from '@nestjs/common';
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
}
