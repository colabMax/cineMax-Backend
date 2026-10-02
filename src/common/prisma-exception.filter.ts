import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const messages: Record<string, [number, string]> = {
      P2002: [409, 'Ya existe un registro con estos datos.'],
      P2003: [409, 'No se puede completar la operación: el registro tiene datos relacionados o la referencia ya no existe.'],
      P2025: [404, 'El registro ya no existe. Actualizá la lista.'],
    };
    const [statusCode, message] = messages[error.code] ?? [500, 'No se pudo completar la operación.'];
    response.status(statusCode).json({ statusCode, message });
  }
}
