import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  const now = new Date('2026-12-01T12:00:00.000Z');
  const price = new Prisma.Decimal('12.50');
  const tx = {
    $queryRaw: jest.fn(),
    showtime: {
      findUnique: jest.fn(),
    },
    roomPosition: {
      findMany: jest.fn(),
    },
    seatHold: {
      updateMany:
        jest.fn<
          (args: Prisma.OrderUpdateManyArgs) => Promise<{ count: number }>
        >(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    },
    order: {
      create:
        jest.fn<(args: Prisma.OrderCreateArgs) => Promise<{ id: string }>>(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  const client: JwtPayload = {
    sub: 'client-id',
    email: 'client@example.com',
    role: Role.CLIENT,
    cinemaId: null,
  };
  const dto: CreateOrderDto = {
    showtimeId: 'showtime-id',
    seatIds: ['seat-1', 'seat-2'],
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'locked' }]);
    tx.showtime.findUnique.mockResolvedValue({
      id: 'showtime-id',
      roomId: 'room-id',
      startTime: new Date('2026-12-01T14:00:00.000Z'),
      price,
    });
    tx.roomPosition.findMany.mockResolvedValue([
      { seatId: 'seat-1', seat: { status: 'AVAILABLE' } },
      { seatId: 'seat-2', seat: { status: 'AVAILABLE' } },
    ]);
    tx.seatHold.updateMany.mockResolvedValue({ count: 0 });
    tx.seatHold.findMany.mockResolvedValue([]);
    tx.seatHold.createMany.mockResolvedValue({ count: 2 });
    tx.ticket.findMany.mockResolvedValue([]);
    tx.order.create.mockResolvedValue({ id: 'order-id' });
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order-id',
      seatHolds: [],
    });
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(OrderService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an order and ten-minute holds using the backend showtime price', async () => {
    await expect(service.create(dto, client)).resolves.toEqual({
      id: 'order-id',
      seatHolds: [],
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    const orderArgs = (
      tx.order.create.mock.calls as unknown as [Prisma.OrderCreateArgs][]
    )[0][0];
    const orderData = orderArgs.data;
    expect(orderData.userId).toBe(client.sub);
    expect(orderData.showtimeId).toBe('showtime-id');
    expect(orderData.totalAmount).toEqual(new Prisma.Decimal('25.00'));
    expect(orderData.externalReference).toMatch(/^CINEMAX-/);
    expect(tx.seatHold.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orderId: 'order-id',
          showtimeId: 'showtime-id',
          seatId: 'seat-1',
          price,
          status: 'PENDING',
          expiresAt: new Date('2026-12-01T12:10:00.000Z'),
        }),
        expect.objectContaining({
          orderId: 'order-id',
          showtimeId: 'showtime-id',
          seatId: 'seat-2',
          price,
          status: 'PENDING',
          expiresAt: new Date('2026-12-01T12:10:00.000Z'),
        }),
      ],
    });
  });

  it('rejects invalid seat counts and duplicates before opening a transaction', async () => {
    await expect(
      service.create({ ...dto, seatIds: [] }, client),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ ...dto, seatIds: ['seat-1', 'seat-1'] }, client),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reports a missing showtime', async () => {
    tx.showtime.findUnique.mockResolvedValue(null);

    await expect(service.create(dto, client)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not reserve seats for a showtime that has started', async () => {
    tx.showtime.findUnique.mockResolvedValue({
      id: 'showtime-id',
      roomId: 'room-id',
      startTime: now,
      price,
    });

    await expect(service.create(dto, client)).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects seats that do not belong to the showtime room', async () => {
    tx.roomPosition.findMany.mockResolvedValue([
      { seatId: 'seat-1', seat: { status: 'AVAILABLE' } },
    ]);

    await expect(service.create(dto, client)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects seats that are out of service', async () => {
    tx.roomPosition.findMany.mockResolvedValue([
      { seatId: 'seat-1', seat: { status: 'OUT_OF_SERVICE' } },
      { seatId: 'seat-2', seat: { status: 'AVAILABLE' } },
    ]);

    await expect(service.create(dto, client)).rejects.toThrow(
      ConflictException,
    );
  });

  it('expires the previous order after its holds have expired', async () => {
    tx.seatHold.findMany
      .mockResolvedValueOnce([{ orderId: 'old-order-id' }])
      .mockResolvedValueOnce([]);

    await service.create(dto, client);

    expect(tx.seatHold.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        orderId: { in: ['old-order-id'] },
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['old-order-id'] },
        status: 'PENDING',
        seatHolds: {
          none: {
            status: 'PENDING',
            expiresAt: { gt: now },
          },
        },
      },
      data: { status: 'EXPIRED' },
    });
  });

  it('does not expire the previous order while any seat hold is still active', async () => {
    tx.seatHold.findMany
      .mockResolvedValueOnce([{ orderId: 'old-order-id' }])
      .mockResolvedValueOnce([{ seatId: 'seat-2' }]);

    await expect(service.create(dto, client)).rejects.toThrow(
      ConflictException,
    );

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['old-order-id'] },
        status: 'PENDING',
        seatHolds: {
          none: {
            status: 'PENDING',
            expiresAt: { gt: now },
          },
        },
      },
      data: { status: 'EXPIRED' },
    });
  });

  it.each(['sold', 'actively held'])(
    'rejects a seat that is already %s',
    async (state) => {
      if (state === 'sold') {
        tx.ticket.findMany.mockResolvedValue([{ seatId: 'seat-1' }]);
      } else {
        tx.seatHold.findMany.mockResolvedValue([{ seatId: 'seat-1' }]);
      }

      await expect(service.create(dto, client)).rejects.toThrow(
        ConflictException,
      );
      expect(tx.order.create).not.toHaveBeenCalled();
    },
  );

  it('maps the active-seat unique-index violation to a conflict', async () => {
    tx.seatHold.createMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique conflict', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['showtimeId', 'seatId'] },
      }),
    );

    await expect(service.create(dto, client)).rejects.toThrow(
      'reservados por otra compra',
    );
  });
});
