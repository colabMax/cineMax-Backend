import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateRoomDto } from './dto/create-room.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA)
  create(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.roomService.createRoom(user.cinemaId!, dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_CINEMA)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.roomService.findAll(user);
  }
}
