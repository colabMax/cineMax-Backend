import { Injectable, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AccessScopeService {
  getCinemaIdForRead(user: JwtPayload): string | null {
    if (user.role === Role.CLIENT || user.role === Role.SUPER_ADMIN) {
      return null;
    }

    if (user.role === Role.ADMIN_CINEMA) {
      if (!user.cinemaId) {
        throw new ForbiddenException(
          'El administrador no tiene un cine asignado',
        );
      }

      return user.cinemaId;
    }

    throw new ForbiddenException(
      'El usuario no tiene permisos para acceder a recursos de cine',
    );
  }

  getCinemaId(user: JwtPayload): string | null {
    if (user.role === Role.SUPER_ADMIN) {
      return null;
    }

    if (user.role === Role.ADMIN_CINEMA) {
      if (!user.cinemaId) {
        throw new ForbiddenException(
          'El administrador no tiene un cine asignado',
        );
      }

      return user.cinemaId;
    }

    throw new ForbiddenException(
      'El usuario no tiene permisos para acceder a recursos de cine',
    );
  }
}
