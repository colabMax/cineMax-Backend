import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CinemaService } from './cinema.service';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('cinema')
export class CinemaController {
  constructor(private cinemaService: CinemaService) {}

  @Post()
  @UseGuards(JwtAuthGuard ,RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createCinemaDto: CreateCinemaDto) {
    return this.cinemaService.createCinema(createCinemaDto);
  }

  @Get()
  findAll() {
    return this.cinemaService.getAllCinemas();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.cinemaService.getCinemaById(id);
  }
}
