import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CinemaModule } from 'src/cinema/cinema.module';

@Module({
  imports: [CinemaModule],
  providers: [RoomService, PrismaService],
  controllers: [RoomController]
})
export class RoomModule {}
