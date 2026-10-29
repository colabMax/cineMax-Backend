import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, RoomPositionType } from '@prisma/client';
import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { CinemaService } from 'src/cinema/cinema.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomService } from './room.service';

describe('RoomService layout changes', () => {
  let service: RoomService;
  const position = {
    id: 'position-id',
    row: 'A',
    column: 1,
    type: RoomPositionType.SEAT,
    seatId: 'seat-id',
    seat: { id: 'seat-id', status: 'AVAILABLE' },
  };
  const tx = {
    $queryRaw: jest.fn(),
    room: {
      findFirst: jest.fn(),
    },
    roomPosition: {
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    },
    seatHold: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    seat: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  const cinemaService = {} as CinemaService;
  const admin: JwtPayload = {
    sub: 'admin-id',
    email: 'admin@example.com',
    role: Role.ADMIN_CINEMA,
    cinemaId: 'cinema-id',
  };
  const dto = {
    positions: [{ row: 'A', column: 1, type: RoomPositionType.AISLE }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'room-id' }]);
    tx.room.findFirst.mockResolvedValue({
      id: 'room-id',
      capacity: 10,
    });
    tx.roomPosition.findMany.mockResolvedValue([position]);
    tx.ticket.findMany.mockResolvedValue([]);
    tx.seatHold.updateMany.mockResolvedValue({ count: 0 });
    tx.seatHold.findMany.mockResolvedValue([]);
    tx.roomPosition.delete.mockResolvedValue(position);
    tx.roomPosition.update.mockResolvedValue({});
    tx.seat.delete.mockResolvedValue({});
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        AccessScopeService,
        { provide: CinemaService, useValue: cinemaService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RoomService);
  });

  it('locks the room and detaches but preserves a seat with hold history', async () => {
    tx.seatHold.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ seatId: 'seat-id' }]);

    await service.updateLayout('room-id', dto, admin);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.roomPosition.update).toHaveBeenCalledWith({
      where: { id: 'position-id' },
      data: {
        type: RoomPositionType.AISLE,
        seatId: null,
      },
    });
    expect(tx.seat.delete).not.toHaveBeenCalled();
  });

  it('blocks removing a seat with an active hold for a future showtime', async () => {
    tx.seatHold.findMany.mockResolvedValueOnce([{ seatId: 'seat-id' }]);

    await expect(service.updateLayout('room-id', dto, admin)).rejects.toThrow(
      BadRequestException,
    );

    expect(tx.roomPosition.update).not.toHaveBeenCalled();
  });

  it('marks expired holds before detaching a historical seat', async () => {
    tx.seatHold.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ seatId: 'seat-id' }]);

    await service.updateLayout('room-id', dto, admin);

    expect(tx.seatHold.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'EXPIRED' },
      }),
    );
  });
});
