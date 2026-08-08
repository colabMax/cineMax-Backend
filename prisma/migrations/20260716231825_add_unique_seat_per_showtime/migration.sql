/*
  Warnings:

  - A unique constraint covering the columns `[showtimeId,seatNumber]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Ticket_showtimeId_seatNumber_key" ON "Ticket"("showtimeId", "seatNumber");
