import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CinemaService } from 'src/cinema/cinema.service';
import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomLayoutDto } from './dto/create-room-layout.dto';
import { RoomPositionType, Prisma } from '@prisma/client';

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

  async createLayout(
    roomId: string,
    dto: CreateRoomLayoutDto,
    user: JwtPayload,
  ) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        ...(cinemaId !== null && { cinemaId }),
      },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    const seatCount = dto.positions.filter(
      (position) => position.type === RoomPositionType.SEAT,
    ).length;

    if (seatCount > room.capacity) {
      throw new BadRequestException(
        `La cantidad de asientos (${seatCount}) no puede ser mayor a la capacidad de la sala (${room.capacity})`,
      );
    }

    const coordinates = new Set<string>();

    for (const position of dto.positions) {
      const coordinate = `${position.row}-${position.column}`;

      if (coordinates.has(coordinate)) {
        throw new BadRequestException(
          `La posición ${position.row}-${position.column} está duplicada`,
        );
      }

      coordinates.add(coordinate);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const position of dto.positions) {
        if (position.type === RoomPositionType.SEAT) {
          const seat = await tx.seat.create({
            data: {},
          });

          await tx.roomPosition.create({
            data: {
              roomId,
              row: position.row,
              column: position.column,
              type: position.type,
              seatId: seat.id,
            },
          });
        } else {
          await tx.roomPosition.create({
            data: {
              roomId,
              row: position.row,
              column: position.column,
              type: position.type,
            },
          });
        }
      }
    });

    return {
      message: 'Layout creado correctamente',
    };
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
            },
          },
        },
      });
    }

    return this.prisma.room.findMany({
      where: {
        cinemaId,
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
          },
        },
      },
    });
  }

  async findById(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        ...(cinemaId !== null && { cinemaId }),
      },
    });

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
      },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    return this.prisma.room.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }

  async delete(id: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaId(user);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        ...(cinemaId !== null && { cinemaId }),
      },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    return this.prisma.room.delete({
      where: {
        id: room.id,
      },
    });
  }
}
