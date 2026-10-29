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
import { RoomPositionType } from '@prisma/client';
import { UpdateRoomLayoutDto } from './dto/update-room-layout.dto';
import { RoomPositionDto } from './dto/room-position.dto';

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

  async getLayout(roomId: string, user: JwtPayload) {
    const cinemaId = this.accessScopeService.getCinemaIdForRead(user);

    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        ...(cinemaId !== null && { cinemaId }),
      },
    });

    if (!room) {
      throw new NotFoundException('Sala no encontrada');
    }

    const positions = await this.prisma.roomPosition.findMany({
      where: {
        roomId,
      },
      include: {
        seat: true,
      },
      orderBy: [
        {
          row: 'asc',
        },
        {
          column: 'asc',
        },
      ],
    });

    return {
      roomId: room.id,
      capacity: room.capacity,
      positions: positions.map((position) => ({
        id: position.id,
        seatId: position.seatId,
        name: `${position.row}${position.column}`,
        row: position.row,
        column: position.column,
        type: position.type,
        ...(position.seat && {
          status: position.seat.status,
        }),
      })),
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

  async updateLayout(
    roomId: string,
    dto: UpdateRoomLayoutDto,
    user: JwtPayload,
  ) {
    const cinemaId = this.accessScopeService.getCinemaId(user);
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
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Room" WHERE "id" = ${roomId} FOR UPDATE
      `;

      const room = await tx.room.findFirst({
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

      const currentPositions = await tx.roomPosition.findMany({
        where: { roomId },
        include: { seat: true },
        orderBy: [{ row: 'asc' }, { column: 'asc' }],
      });

      type CurrentPosition = (typeof currentPositions)[number];
      const currentMap = new Map(
        currentPositions.map((position) => [
          `${position.row}-${position.column}`,
          position,
        ]),
      );
      const newMap = new Map(
        dto.positions.map((position) => [
          `${position.row}-${position.column}`,
          position,
        ]),
      );
      const positionsToCreate: RoomPositionDto[] = [];
      const positionsToDelete: CurrentPosition[] = [];
      const positionsToChange: {
        current: CurrentPosition;
        new: RoomPositionDto;
      }[] = [];

      for (const [coordinate, newPosition] of newMap) {
        const currentPosition = currentMap.get(coordinate);

        if (!currentPosition) {
          positionsToCreate.push(newPosition);
        } else if (currentPosition.type !== newPosition.type) {
          positionsToChange.push({
            current: currentPosition,
            new: newPosition,
          });
        }
      }

      for (const [coordinate, currentPosition] of currentMap) {
        if (!newMap.has(coordinate)) {
          positionsToDelete.push(currentPosition);
        }
      }

      const affectedSeatIds = [
        ...positionsToDelete
          .filter((position) => position.type === RoomPositionType.SEAT)
          .map((position) => position.seatId),
        ...positionsToChange
          .filter(
            (position) =>
              position.current.type === RoomPositionType.SEAT &&
              position.new.type === RoomPositionType.AISLE,
          )
          .map((position) => position.current.seatId),
      ].filter((seatId): seatId is string => seatId !== null);
      const uniqueAffectedSeatIds = [...new Set(affectedSeatIds)];
      const now = new Date();

      const tickets = await tx.ticket.findMany({
        where: { seatId: { in: uniqueAffectedSeatIds } },
        select: { seatId: true },
      });
      const seatIdsWithTickets = new Set(
        tickets.map((ticket) => ticket.seatId),
      );

      for (const position of [
        ...positionsToDelete,
        ...positionsToChange.map((item) => item.current),
      ]) {
        if (
          position.type === RoomPositionType.SEAT &&
          position.seatId &&
          seatIdsWithTickets.has(position.seatId)
        ) {
          throw new BadRequestException(
            `No se puede retirar el asiento ${position.row}${position.column} porque tiene tickets asociados`,
          );
        }
      }

      await tx.seatHold.updateMany({
        where: {
          seatId: { in: uniqueAffectedSeatIds },
          status: 'PENDING',
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      });

      const activeHolds = await tx.seatHold.findMany({
        where: {
          seatId: { in: uniqueAffectedSeatIds },
          status: 'PENDING',
          expiresAt: { gt: now },
          showtime: { startTime: { gt: now } },
        },
        select: { seatId: true },
      });

      if (activeHolds.length > 0) {
        throw new BadRequestException(
          'No se puede modificar el layout mientras haya reservas activas para esos asientos',
        );
      }

      const historicalHolds = await tx.seatHold.findMany({
        where: { seatId: { in: uniqueAffectedSeatIds } },
        select: { seatId: true },
      });
      const seatIdsWithHolds = new Set(
        historicalHolds.map((hold) => hold.seatId),
      );

      for (const position of positionsToCreate) {
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

      for (const position of positionsToDelete) {
        await tx.roomPosition.delete({
          where: {
            id: position.id,
          },
        });

        if (
          position.type === RoomPositionType.SEAT &&
          position.seatId &&
          !seatIdsWithHolds.has(position.seatId)
        ) {
          await tx.seat.delete({
            where: {
              id: position.seatId,
            },
          });
        }
      }

      for (const position of positionsToChange) {
        if (
          position.current.type === RoomPositionType.SEAT &&
          position.new.type === RoomPositionType.AISLE
        ) {
          await tx.roomPosition.update({
            where: {
              id: position.current.id,
            },
            data: {
              type: RoomPositionType.AISLE,
              seatId: null,
            },
          });

          if (!seatIdsWithHolds.has(position.current.seatId!)) {
            await tx.seat.delete({
              where: {
                id: position.current.seatId!,
              },
            });
          }
        }
      }

      for (const position of positionsToChange) {
        if (
          position.current.type === RoomPositionType.AISLE &&
          position.new.type === RoomPositionType.SEAT
        ) {
          const seat = await tx.seat.create({
            data: {},
          });

          await tx.roomPosition.update({
            where: {
              id: position.current.id,
            },
            data: {
              type: RoomPositionType.SEAT,
              seatId: seat.id,
            },
          });
        }
      }
    });

    return {
      message: 'Layout actualizado correctamente',
    };
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
