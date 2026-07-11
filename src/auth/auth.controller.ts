import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto/create-user.dto';
import { AuthService } from './auth.service';
import { ResendVerificationCodeDto } from './dto/resendVerificationCodeDto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from './guards/roles/roles.guard';
import { Role } from '@prisma/client';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: { email: string; code: string }) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification-code')
  resendVerificationCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  admin() {
    return {
      message: 'Bienvenido, administrador',
    }
  }
}
