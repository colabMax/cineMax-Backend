import { Type } from "class-transformer";
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { ShowtimeLanguage } from "@prisma/client";

export class CreateShowtimeDto {
  @IsUUID()
  @IsNotEmpty()
  movieId!: string;
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startTime!: Date;
  /** Subtitulada por defecto. */
  @IsOptional()
  @IsEnum(ShowtimeLanguage)
  language?: ShowtimeLanguage;
}
