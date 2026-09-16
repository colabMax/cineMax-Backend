import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CinemaModule } from 'src/cinema/cinema.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [CinemaModule, AuthModule],
  providers: [RoomService, PrismaService],
  controllers: [RoomController]
})
export class RoomModule {}
