import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MovieService } from './movie.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Role } from '@prisma/client';
import { CreateMovieDto } from './dto/create-movie.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface'; 
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Controller('movie')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA, Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateMovieDto, @CurrentUser() user: JwtPayload
  ) {
    return this.movieService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA, Role.SUPER_ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.movieService.findAll(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA, Role.SUPER_ADMIN)
  findById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.movieService.findById(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateMovieDto, @CurrentUser() user: JwtPayload) {
    return this.movieService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_CINEMA, Role.SUPER_ADMIN)
  delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.movieService.delete(id, user);
  }
}
