-- CreateEnum
CREATE TYPE "ShowtimeFormat" AS ENUM ('TWO_D', 'THREE_D');

-- AlterTable
ALTER TABLE "Showtime" ADD COLUMN     "format" "ShowtimeFormat" NOT NULL DEFAULT 'TWO_D';
