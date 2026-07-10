import { EmailVerificationService } from 'src/email-verification/email-verification.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { VerifyEmailDto } from 'src/email-verification/dto/verify-email-dto';
import { EmailService } from 'src/email/email.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async register(userData: CreateUserDto) {
    userData.name = userData.name.trim().replace(/\s+/g, ' ');

    userData.email = userData.email.trim().toLowerCase();
    const userExists = await this.userService.findByEmail(userData.email);

    if (userExists) {
      throw new ConflictException('El usuario ya existe');
    }

    const user = await this.userService.createLocalUser(userData);

    const verification = await this.emailVerificationService.createCode(user.id);

    await this.emailService.sendVerificationEmail(
      user.email,
      verification.code,
    )

    return {
      message: 'El usuario ha sido creado correctamente, se ha enviado un correo de verificación.'
    }
  }

  async login(dto: LoginDto) {
    dto.email = dto.email.trim().toLowerCase();

    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    if (user.authProvider !== 'LOCAL') {
      throw new ConflictException('El usuario no esta registrado con este método de autenticación');
    };

    if (!user.emailVerified) {
      throw new ConflictException('El usuario no ha verificado su correo electrónico');
    }

    if (!user.password) {
      throw new ConflictException('El usuario no tiene contraseña');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new ConflictException('La contraseña es incorrecta');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
    }
  }

  async generateAccessToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async verifyEmail(dto: VerifyEmailDto) {
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

    const userVerfy = await this.userService.getEmailVerificationStatus(
      user.id,
    );

    if (userVerfy?.emailVerified) {
      throw new ConflictException('El usuario ya ha sido verificado');
    }

    return await this.emailVerificationService.resendCode(user.id);
  }
}
