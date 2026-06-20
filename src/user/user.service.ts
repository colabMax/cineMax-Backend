import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from './../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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

  async createUser(userData: CreateUserDto) {
    userData.name = userData.name.trim().replace(/\s+/g, ' ');

    userData.email = userData.email.trim().toLowerCase();
    const userExists = await this.findByEmail(userData.email);

    if (userExists) {
      throw new ConflictException('El usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return await this.prisma.user.create({
      data: { ...userData, password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        
      }
    });
  }
}
