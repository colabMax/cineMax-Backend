import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { AssignCinemaAdminDto } from './dto/assign-cinema-admin.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  createUser(@Body() userData: CreateUserDto) {
    return this.userService.createLocalUser(userData);
  }

  @Patch(':userId/cinema-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  assignCinemaAdmin(
    @Param('userId') userId: string,
    @Body() dto: AssignCinemaAdminDto,
  ) {
    return this.userService.assignCinemaAdmin(userId, dto.cinemaId);
  }
}
