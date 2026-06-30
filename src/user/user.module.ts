import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, EmailVerificationService]
})
export class UserModule {}
