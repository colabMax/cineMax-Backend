import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';

const HOLD_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, user: JwtPayload) {
    if (
      dto.seatIds.length < 1 ||
      dto.seatIds.length > 6 ||
      new Set(dto.seatIds).size !== dto.seatIds.length
    ) {
      throw new BadRequestException(
        'La compra debe incluir entre 1 y 6 asientos distintos',
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockShowtime(tx, dto.showtimeId);

        const showtime = await tx.showtime.findUnique({
          where: { id: dto.showtimeId },
          select: {
            id: true,
            roomId: true,
            startTime: true,
            price: true,
          },
        });

        if (!showtime) {
          throw new NotFoundException('Showtime no encontrada');
        }

        if (showtime.startTime <= now) {
          throw new BadRequestException(
            'No se pueden reservar asientos para una función que ya comenzó',
          );
        }

        await this.lockRoom(tx, showtime.roomId);

        const positions = await tx.roomPosition.findMany({
          where: {
            roomId: showtime.roomId,
            type: 'SEAT',
            seatId: { in: dto.seatIds },
          },
          select: {
            seatId: true,
            seat: {
              select: {
                status: true,
              },
            },
          },
        });

        if (positions.length !== dto.seatIds.length) {
          throw new BadRequestException(
            'Uno o más asientos no pertenecen a la sala de esta función',
          );
        }

        if (
          positions.some((position) => position.seat?.status !== 'AVAILABLE')
        ) {
          throw new ConflictException(
            'Uno o más asientos no están disponibles',
          );
        }

        await tx.seatHold.updateMany({
          where: {
            showtimeId: showtime.id,
            seatId: { in: dto.seatIds },
            status: 'PENDING',
            expiresAt: { lte: now },
          },
          data: {
            status: 'EXPIRED',
          },
        });

        const expiredHolds = await tx.seatHold.findMany({
          where: {
            showtimeId: showtime.id,
            seatId: { in: dto.seatIds },
            status: 'EXPIRED',
          },
          select: { orderId: true },
        });
        const expiredOrderIds = [
          ...new Set(expiredHolds.map((hold) => hold.orderId)),
        ];

        if (expiredOrderIds.length > 0) {
          await tx.seatHold.updateMany({
            where: {
              orderId: { in: expiredOrderIds },
              status: 'PENDING',
              expiresAt: { lte: now },
            },
            data: {
              status: 'EXPIRED',
            },
          });

          await tx.order.updateMany({
            where: {
              id: { in: expiredOrderIds },
              status: 'PENDING',
              seatHolds: {
                none: {
                  status: 'PENDING',
                  expiresAt: { gt: now },
                },
              },
            },
            data: {
              status: 'EXPIRED',
            },
          });
        }

        const soldSeats = await tx.ticket.findMany({
          where: {
            showtimeId: showtime.id,
            seatId: { in: dto.seatIds },
          },
          select: { seatId: true },
        });

        if (soldSeats.length > 0) {
          throw new ConflictException(
            'Uno o más asientos ya fueron vendidos para esta función',
          );
        }

        const activeHolds = await tx.seatHold.findMany({
          where: {
            showtimeId: showtime.id,
            seatId: { in: dto.seatIds },
            status: 'PENDING',
            expiresAt: { gt: now },
          },
          select: { seatId: true },
        });

        if (activeHolds.length > 0) {
          throw new ConflictException(
            'Uno o más asientos están reservados temporalmente',
          );
        }

        const order = await tx.order.create({
          data: {
            userId: user.sub,
            showtimeId: showtime.id,
            totalAmount: showtime.price.mul(dto.seatIds.length),
            externalReference: `CINEMAX-${randomUUID()}`,
          },
        });

        await tx.seatHold.createMany({
          data: dto.seatIds.map((seatId) => ({
            orderId: order.id,
            showtimeId: showtime.id,
            seatId,
            price: showtime.price,
            status: 'PENDING',
            expiresAt,
            updatedAt: now,
          })),
        });

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { seatHolds: true },
        });
      });
    } catch (error) {
      if (this.isActiveSeatHoldConflict(error)) {
        throw new ConflictException(
          'Uno o más asientos fueron reservados por otra compra',
        );
      }

      throw error;
    }
  }

  private lockShowtime(
    tx: Prisma.TransactionClient,
    showtimeId: string,
  ): Promise<Array<{ id: string }>> {
    return tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Showtime" WHERE "id" = ${showtimeId} FOR UPDATE
    `;
  }

  private lockRoom(
    tx: Prisma.TransactionClient,
    roomId: string,
  ): Promise<Array<{ id: string }>> {
    return tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Room" WHERE "id" = ${roomId} FOR UPDATE
    `;
  }

  private isActiveSeatHoldConflict(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.target;
    if (typeof target === 'string') {
      return target.includes('SeatHold_active_showtime_seat_key');
    }

    return (
      Array.isArray(target) &&
      target.includes('showtimeId') &&
      target.includes('seatId')
    );
  }
}
