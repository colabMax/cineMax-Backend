import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ShowtimeLanguage } from '@prisma/client';

export class CreateShowtimeDto {
  @IsUUID()
  @IsNotEmpty()
  movieId!: string;

  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  price!: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startTime!: Date;
  /** Subtitulada por defecto. */
  @IsOptional()
  @IsEnum(ShowtimeLanguage)
  language?: ShowtimeLanguage;
}
