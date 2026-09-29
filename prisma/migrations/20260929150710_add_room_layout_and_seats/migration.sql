/*
  Warnings:

  - You are about to drop the column `seatNumber` on the `Ticket` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[showtimeId,seatId]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seatId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoomPositionType" AS ENUM ('SEAT', 'AISLE');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'OUT_OF_SERVICE');

-- DropIndex
DROP INDEX "Ticket_showtimeId_seatNumber_key";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "seatNumber",
ADD COLUMN     "seatId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "RoomPosition" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "column" INTEGER NOT NULL,
    "type" "RoomPositionType" NOT NULL,
    "seatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomPosition_seatId_key" ON "RoomPosition"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomPosition_roomId_row_column_key" ON "RoomPosition"("roomId", "row", "column");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_showtimeId_seatId_key" ON "Ticket"("showtimeId", "seatId");

-- AddForeignKey
ALTER TABLE "RoomPosition" ADD CONSTRAINT "RoomPosition_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPosition" ADD CONSTRAINT "RoomPosition_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
