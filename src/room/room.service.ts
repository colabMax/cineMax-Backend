import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CinemaService } from 'src/cinema/cinema.service';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService, private readonly cinemaService: CinemaService) {}

  async createRoom(cinemaId: string, dto: CreateRoomDto) {
    await this.cinemaService.getCinemaById(cinemaId);
    
    return this.prisma.room.create({
      data: {
        name: dto.name,
        capacity: dto.capacity,
        cinemaId
      }
    })
  }
}
