import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from './../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { CinemaService } from 'src/cinema/cinema.service';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private cinemaService: CinemaService,
  ) {}

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async createLocalUser(userData: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      }
    })
  }

  async markEmailAsVerified(userId: string) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        emailVerified: true,
      }
    })
  }

  async getEmailVerificationStatus(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        emailVerified: true,
      }
    })
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async assignCinemaAdmin(userId: string, cinemaId: string) {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new ConflictException('El usuario no existe');
    }

    const cinema = await this.cinemaService.getCinemaById(cinemaId);

    if (!cinema) {
      throw new ConflictException('El cine no existe');
    }

    const currentCinemaAdmin = await this.prisma.user.findFirst({
      where: {
        cinemaId,
        role: Role.ADMIN_CINEMA,
        id: {
          not: userId,
        },
      },
    });

    if (currentCinemaAdmin) {
      throw new ConflictException('Ya existe un administrador para este cine');
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: Role.ADMIN_CINEMA,
        cinemaId,
      },
      select: {
        email: true,
        name: true,
        role: true,
        cinemaId: true,
      }
    })
  }
}
