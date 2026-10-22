import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AccessScopeService } from 'src/auth/services/access-scope.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ShowtimeService } from './showtime.service';

describe('ShowtimeService', () => {
  let service: ShowtimeService;
  const prisma = {
    showtime: {
      findFirst: jest.fn(),
      updateManyAndReturn: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const cinemaAdmin: JwtPayload = {
    sub: 'admin-id',
    email: 'admin@example.com',
    role: Role.ADMIN_CINEMA,
    cinemaId: 'cinema-1',
  };

  beforeEach(async () => {
    prisma.showtime.findFirst.mockReset().mockResolvedValue(null);
    prisma.showtime.updateManyAndReturn.mockReset().mockResolvedValue([]);
    prisma.showtime.deleteMany.mockReset().mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimeService,
        AccessScopeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ShowtimeService);
  });

  it('awaits the scoped lookup and reports missing showtimes', async () => {
    await expect(service.findById('showtime-id', cinemaAdmin)).rejects.toThrow(
      'Showtime no encontrada',
    );

    expect(prisma.showtime.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'showtime-id',
          movie: { cinemaId: 'cinema-1' },
        },
      }),
    );
  });

  it('does not update a showtime outside the administrator cinema', async () => {
    const startTime = new Date();

    await expect(
      service.update('showtime-id', { startTime }, cinemaAdmin),
    ).rejects.toThrow('Showtime no encontrada');

    expect(prisma.showtime.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: 'showtime-id',
        movie: { cinemaId: 'cinema-1' },
      },
      data: { startTime },
    });
  });

  it('does not delete a showtime outside the administrator cinema', async () => {
    await expect(service.delete('showtime-id', cinemaAdmin)).rejects.toThrow(
      'Showtime no encontrada',
    );

    expect(prisma.showtime.findFirst).toHaveBeenCalled();
    expect(prisma.showtime.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes only within the administrator cinema', async () => {
    const showtime = { id: 'showtime-id' };
    prisma.showtime.findFirst.mockResolvedValue(showtime);
    prisma.showtime.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.delete('showtime-id', cinemaAdmin)).resolves.toEqual(
      showtime,
    );

    expect(prisma.showtime.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'showtime-id',
        movie: { cinemaId: 'cinema-1' },
      },
    });
  });
});
