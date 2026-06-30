import { PrismaService } from './../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailVerificationService {
  constructor(private prisma: PrismaService) {}

  async createCode(userId:string){
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() + 10
    )

    return await this.prisma.emailVerification.create({
      data: {
        code,
        expiresAt,
        userId
      }
    })
  }
}
