import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { EmailVerificationModule } from './email-verification/email-verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    AuthModule,
    PrismaModule,
    EmailVerificationModule
  ],
  controllers: [AppController],
  providers: [AppService, EmailVerificationService],
})
export class AppModule {}
