import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { EmailVerificationModule } from 'src/email-verification/email-verification.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [UserModule, EmailVerificationModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
