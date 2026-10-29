import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ShowtimeService } from './showtime.service';

describe('ShowtimeService', () => {
  let service: ShowtimeService;
  const tx = {
    $queryRaw: jest.fn(),
    showtime: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    seatHold: {
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    ticket: {
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
    showtime: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    movie: {
      findFirst: jest.fn(),
    },
    room: {
      findFirst: jest.fn(),
    },
  };
  const cinemaAdmin: JwtPayload = {
    sub: 'admin-id',
    email: 'admin@example.com',
    role: Role.ADMIN_CINEMA,
    cinemaId: 'cinema-1',
  };
  const client: JwtPayload = {
    sub: 'client-id',
    email: 'client@example.com',
    role: Role.CLIENT,
    cinemaId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'showtime-id' }]);
    tx.showtime.findFirst.mockResolvedValue({ id: 'showtime-id' });
    tx.showtime.update.mockResolvedValue({ id: 'showtime-id' });
    tx.showtime.delete.mockResolvedValue({ id: 'showtime-id' });
    tx.seatHold.updateMany.mockResolvedValue({ count: 0 });
    tx.seatHold.count.mockResolvedValue(0);
    tx.ticket.count.mockResolvedValue(0);
    tx.order.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );
    prisma.showtime.findFirst.mockResolvedValue({
      id: 'showtime-id',
      startTime: new Date(),
    });
    prisma.showtime.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimeService,
        AccessScopeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ShowtimeService);
  });

  it('allows authenticated clients to list showtimes', async () => {
    await service.findAll(client);

    expect(prisma.showtime.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('allows authenticated clients to read an individual showtime', async () => {
    await service.findById('showtime-id', client);

    expect(prisma.showtime.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'showtime-id' } }),
    );
  });

  it('keeps showtime reads scoped to the cinema administrator', async () => {
    await service.findById('showtime-id', cinemaAdmin);

    expect(prisma.showtime.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'showtime-id', movie: { cinemaId: 'cinema-1' } },
      }),
    );
  });

  it('does not update a showtime outside the administrator cinema', async () => {
    tx.showtime.findFirst.mockResolvedValue(null);

    await expect(
      service.update('showtime-id', { startTime: new Date() }, cinemaAdmin),
    ).rejects.toThrow(NotFoundException);

    expect(tx.showtime.update).not.toHaveBeenCalled();
  });

  it.each([
    ['tickets', 1, 0],
    ['active holds', 0, 1],
  ])('does not update a showtime with %s', async (_reason, tickets, holds) => {
    tx.ticket.count.mockResolvedValue(tickets);
    tx.seatHold.count.mockResolvedValue(holds);

    await expect(
      service.update('showtime-id', { startTime: new Date() }, cinemaAdmin),
    ).rejects.toThrow(ConflictException);

    expect(tx.showtime.update).not.toHaveBeenCalled();
  });

  it('updates a showtime only after locking it and checking active reservations', async () => {
    const dto = { startTime: new Date() };

    await service.update('showtime-id', dto, cinemaAdmin);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.seatHold.updateMany).toHaveBeenCalled();
    expect(tx.showtime.update).toHaveBeenCalledWith({
      where: { id: 'showtime-id' },
      data: dto,
    });
  });

  it('preserves showtime history instead of deleting referenced records', async () => {
    tx.order.count.mockResolvedValue(1);

    await expect(service.delete('showtime-id', cinemaAdmin)).rejects.toThrow(
      ConflictException,
    );

    expect(tx.showtime.delete).not.toHaveBeenCalled();
  });

  it('deletes a showtime with no orders, holds, or tickets', async () => {
    await expect(service.delete('showtime-id', cinemaAdmin)).resolves.toEqual({
      id: 'showtime-id',
    });

    expect(tx.showtime.delete).toHaveBeenCalledWith({
      where: { id: 'showtime-id' },
    });
  });
});
