import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { EmailVerificationModule } from 'src/email-verification/email-verification.module';

@Module({
  imports: [UserModule, EmailVerificationModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
