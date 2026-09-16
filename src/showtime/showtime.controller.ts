import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ShowtimeService } from './showtime.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

@Controller('showtime')
export class ShowtimeController {
  constructor(
    private readonly showtimeService: ShowtimeService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA, Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateShowtimeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.showtimeService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_CINEMA)
  findAll(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.showtimeService.findAll(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_CINEMA)
  findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.showtimeService.findById(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_CINEMA)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.showtimeService.update(id, dto, user);
  }
}
