import { UserService } from 'src/user/user.service';
import { PrismaService } from './../prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class EmailVerificationService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService
  ) {}

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

  async verifyCode(userId:string, code:string){
    const verification = await this.prisma.emailVerification.findUnique({
      where: {
        userId,
      }
    })

    if (!verification) {
      throw new NotFoundException('No se encontró la verificación')
    }

    const now = new Date();

    if (verification.expiresAt < now) {
      await this.deleteCode(userId)

      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.')
    }

    if (verification.code !== code) {
      throw new BadRequestException('El código no es correcto')
    }

    await this.userService.markEmailAsVerified(userId)

    await this.prisma.emailVerification.delete({
      where: {
        userId,
      }
    })

    return {
      message: 'El correo ha sido verificado correctamente'
    }
  }
  
  async findCode(userId:string){
    return await this.prisma.emailVerification.findUnique({
      where: {
        userId: userId,
      }
    })
  }
  
  async resendCode(userId:string){
    const code = await this.findCode(userId)

    if (code) {
      await this.deleteCode(userId)
    }

    const newCode = await this.createCode(userId)

    return {
      message: 'Se ha enviado un nuevo código de verificación',
      code: newCode.code,
      expiresAt: newCode.expiresAt
    }
  }

  async deleteCode(userId:string){
    await this.prisma.emailVerification.delete({
      where: {
        userId,
      }
    })
  }

}
