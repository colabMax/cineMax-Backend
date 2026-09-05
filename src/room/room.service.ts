import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CinemaService } from 'src/cinema/cinema.service';
import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cinemaService: CinemaService,
    private readonly accessScopeService: AccessScopeService,
  ) {}

  async createRoom(cinemaId: string, dto: CreateRoomDto) {
    await this.cinemaService.getCinemaById(cinemaId);

    return this.prisma.room.create({
      data: {
        name: dto.name,
        capacity: dto.capacity,
        cinemaId,
      },
    });
  }

  async findAll(user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    if (cinemaId === null) {
      return this.prisma.room.findMany({
        select: {
          id: true,
          name: true,
          capacity: true,
          createdAt: true,
          cinema: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });
    }

    return this.prisma.room.findMany({
      where: {
        cinemaId
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        createdAt: true,
        cinema: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })
  }

  async findById(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        ...(cinemaId !== null && { cinemaId }),
      }
    })

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }
    
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        ...(cinemaId !== null && { cinemaId }),
      }
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    return this.prisma.room.update({
      where: {
        id
      },
      data: {
        ...dto,
      }
    })

  }
}
