import { EmailVerificationService } from 'src/email-verification/email-verification.service';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { VerifyEmailDto } from 'src/email-verification/dto/verify-email-dto';
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService, private emailVerificationService: EmailVerificationService) {}

  async register(userData: CreateUserDto) {
    userData.name = userData.name.trim().replace(/\s+/g, ' ');

    userData.email = userData.email.trim().toLowerCase();
    const userExists = await this.userService.findByEmail(userData.email);

    if (userExists) {
      throw new ConflictException('El usuario ya existe');
    }

    const user = await this.userService.createLocalUser(userData);

    await this.emailVerificationService.createCode(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async verifyEmail( dto: VerifyEmailDto) {

    dto.email = dto.email.trim().toLowerCase();
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new ConflictException('El usuario no existe');
    }

    return this.emailVerificationService.verifyCode(user.id, dto.code);

  }

  async resendVerificationCode(email: string) {

    email = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    const userVerfy = await this.userService.getEmailVerificationStatus(user.id);

    if (userVerfy?.emailVerified) {
      throw new ConflictException('El usuario ya ha sido verificado');
    }

    return await this.emailVerificationService.resendCode(user.id);

  }
}
