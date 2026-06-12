/*
  Warnings:

  - You are about to drop the column `PosterUrl` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `TrailerUrl` on the `Movie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "PosterUrl",
DROP COLUMN "TrailerUrl",
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "trailerUrl" TEXT;
