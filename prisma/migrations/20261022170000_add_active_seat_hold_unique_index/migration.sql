-- Expire stale holds before enforcing one pending hold per showtime seat.
UPDATE "SeatHold"
SET "status" = 'EXPIRED',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'PENDING'
  AND "expiresAt" <= CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "SeatHold_active_showtime_seat_key"
ON "SeatHold" ("showtimeId", "seatId")
WHERE "status" = 'PENDING';
