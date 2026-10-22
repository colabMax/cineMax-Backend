import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

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
}
