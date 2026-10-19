-- CreateEnum
CREATE TYPE "ShowtimeLanguage" AS ENUM ('SUBTITLED', 'DUBBED', 'ORIGINAL');

-- AlterTable
ALTER TABLE "Showtime" ADD COLUMN     "language" "ShowtimeLanguage" NOT NULL DEFAULT 'SUBTITLED';
