import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [PrismaModule, UserModule],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
}
)
export class EmailVerificationModule {}
