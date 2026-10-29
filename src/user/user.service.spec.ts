import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { CinemaService } from 'src/cinema/cinema.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  const prisma = {
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma.user.findMany.mockReset().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: CinemaService, useValue: {} },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('returns only non-sensitive user fields', async () => {
    await service.findAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        cinemaId: true,
        profileCompleted: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('restricts the user list endpoint to super administrators', () => {
    const handler = Object.getOwnPropertyDescriptor(
      UserController.prototype,
      'findAll',
    )?.value as object;

    expect(Reflect.getMetadata('__guards__', handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([Role.SUPER_ADMIN]);
  });
});
